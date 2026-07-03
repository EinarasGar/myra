-- Demo / showcase dataset for the default user. Applied on demand via `make seed-demo`, not as an
-- automatic migration. Self-contained and idempotent: it ensures the default user exists, upserts
-- every instrument it needs by ticker, seeds rate history for custom assets only (listed assets are
-- priced by the market-data worker), and bails out early if the user already has accounts. All dates
-- are anchored to now() so the dataset is always current at the moment it is loaded.
--
-- Persona: Alex Fletcher, 31, data engineer in Walthamstow. 24 months of history: steady saving and
-- investing, a rough quarter around month 13-15 (boiler dies, buys a used car, markets wobble), a job
-- change with a raise at month 16, then recovery to an all-time high today. Randomness is seeded
-- (setseed) so the same load date always produces the same dataset; wealth-building flows are
-- deterministic and only discretionary spending is random, so the net-worth arc is stable.

CREATE OR REPLACE FUNCTION _seed_pair_id(p_base int, p_quote int) RETURNS int
LANGUAGE plpgsql AS $fn$
DECLARE pid int;
BEGIN
    SELECT id INTO pid FROM asset_pairs WHERE pair1 = p_base AND pair2 = p_quote;
    IF pid IS NULL THEN
        INSERT INTO asset_pairs (pair1, pair2) VALUES (p_base, p_quote) RETURNING id INTO pid;
    END IF;
    RETURN pid;
END $fn$;

-- base_pair_id stores the denominating-currency asset id; valuation reads the (asset -> currency) pair.
CREATE OR REPLACE FUNCTION _seed_asset(p_type int, p_name text, p_ticker text, p_isin text, p_ccy int, p_user uuid) RETURNS int
LANGUAGE plpgsql AS $fn$
DECLARE aid int;
BEGIN
    SELECT id INTO aid FROM assets WHERE ticker = p_ticker;
    IF aid IS NULL THEN
        INSERT INTO assets (asset_type, asset_name, ticker, isin, base_pair_id, user_id)
        VALUES (p_type, p_name, p_ticker, p_isin, p_ccy, p_user)
        RETURNING id INTO aid;
    ELSE
        UPDATE assets SET base_pair_id = COALESCE(base_pair_id, p_ccy) WHERE id = aid;
    END IF;
    PERFORM _seed_pair_id(aid, p_ccy);
    RETURN aid;
END $fn$;

-- Sparse manual appraisals at p_step-month spacing, last value pinned at now() so the valuation
-- never trails off into a stale plateau.
CREATE OR REPLACE FUNCTION _seed_flat_rates(p_pair int, p_pts numeric[], p_step int DEFAULT 2) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE i int; n int := array_length(p_pts, 1);
BEGIN
    FOR i IN 1..n LOOP
        INSERT INTO asset_history (pair_id, rate, recorded_at)
        VALUES (p_pair, p_pts[i], date_trunc('day', now()) - make_interval(months => (n - i) * p_step) - interval '2 days')
        ON CONFLICT (pair_id, recorded_at) DO NOTHING;
    END LOOP;
    INSERT INTO asset_history (pair_id, rate, recorded_at)
    VALUES (p_pair, p_pts[n], date_trunc('hour', now()))
    ON CONFLICT (pair_id, recorded_at) DO NOTHING;
END $fn$;

-- Daily synthetic price series: geometric Brownian bridge from p_start to p_end (endpoints pinned),
-- with a Gaussian dip centred at p_dipf of the timeline. One point per day matches the chart's
-- finest long-range bin, and a final point at now() kills the trailing plateau.
CREATE OR REPLACE FUNCTION _seed_gbm(p_pair int, p_days int, p_start numeric, p_end numeric, p_vol numeric, p_dipf numeric, p_dip numeric) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE
    w numeric[] := ARRAY[0]; i int; frac numeric; sigma numeric := p_vol / sqrt(365.0);
    g numeric; lp numeric; r numeric;
BEGIN
    FOR i IN 1..p_days LOOP
        g := sqrt(-2 * ln(GREATEST(random(), 1e-12))) * cos(2 * pi() * random());
        w := w || (w[i] + sigma * g);
    END LOOP;
    FOR i IN 0..p_days LOOP
        frac := i::numeric / p_days;
        lp := ln(p_start) + frac * (ln(p_end) - ln(p_start))
              + (w[i + 1] - frac * w[p_days + 1])
              - p_dip * exp(-((frac - p_dipf) * (frac - p_dipf)) / (2 * 0.055 * 0.055));
        r := round(exp(lp)::numeric, 6);
        INSERT INTO asset_history (pair_id, rate, recorded_at)
        VALUES (p_pair, GREATEST(r, 0.000001), date_trunc('day', now()) - make_interval(days => p_days - i) - interval '2 days')
        ON CONFLICT (pair_id, recorded_at) DO NOTHING;
    END LOOP;
    INSERT INTO asset_history (pair_id, rate, recorded_at)
    VALUES (p_pair, round(p_end, 6), date_trunc('hour', now()))
    ON CONFLICT (pair_id, recorded_at) DO NOTHING;
END $fn$;

CREATE OR REPLACE FUNCTION _rate_on(p_pair int, p_at timestamptz, p_fallback numeric) RETURNS numeric
LANGUAGE sql AS $fn$
    SELECT COALESCE(
        (SELECT rate FROM asset_history WHERE pair_id = p_pair AND recorded_at <= p_at ORDER BY recorded_at DESC LIMIT 1),
        p_fallback);
$fn$;

CREATE OR REPLACE FUNCTION _rnd(lo numeric, hi numeric) RETURNS numeric
LANGUAGE sql AS $fn$ SELECT lo + random() * (hi - lo); $fn$;

CREATE OR REPLACE FUNCTION _rnd2(lo numeric, hi numeric) RETURNS numeric
LANGUAGE sql AS $fn$ SELECT round((lo + random() * (hi - lo))::numeric, 2); $fn$;

CREATE OR REPLACE FUNCTION _rndi(lo int, hi int) RETURNS int
LANGUAGE sql AS $fn$ SELECT LEAST(hi, floor(lo + random() * (hi - lo + 1))::int); $fn$;

-- Seasonal weight multiplier keyed to the CALENDAR month, so behavior lands in the right season
-- whenever the seed is loaded (Dry January, summer beer gardens, winter takeaways).
CREATE OR REPLACE FUNCTION _szn(p_kind text, p_mo int) RETURNS numeric
LANGUAGE sql AS $fn$
    SELECT CASE
        WHEN p_kind = 'pub' AND p_mo = 1 THEN 0.15
        WHEN p_kind = 'pub' AND p_mo BETWEEN 6 AND 8 THEN 1.3
        WHEN p_kind = 'restaurant' AND p_mo = 1 THEN 0.4
        WHEN p_kind = 'takeaway' AND (p_mo >= 11 OR p_mo <= 2) THEN 1.15
        ELSE 1.0
    END;
$fn$;

-- Weighted random merchant draw (Efraimidis-Spirakis) over the session-local pool table _m,
-- gated by day-of-week, month index availability, and the merchants already used today.
CREATE OR REPLACE FUNCTION _pick(p_dow int, p_m int, p_mo int, p_kinds text[], p_excl int[])
RETURNS TABLE(id int, merchant text, cat int, kind text, acct text, lo numeric, hi numeric, hlo int, hhi int)
LANGUAGE plpgsql AS $fn$
BEGIN
    RETURN QUERY
    SELECT m.id, m.merchant, m.cat, m.kind, m.acct, m.lo, m.hi, m.hlo, m.hhi
    FROM _m m
    WHERE m.kind = ANY(p_kinds)
      AND p_dow = ANY(m.dows)
      AND p_m >= m.m_from AND p_m < m.m_to
      AND NOT (m.id = ANY(p_excl))
    ORDER BY -ln(GREATEST(random(), 1e-12)) / (m.w * _szn(m.kind, p_mo))
    LIMIT 1;
END $fn$;

CREATE OR REPLACE FUNCTION _tx(p_user uuid, p_type int, p_date timestamptz, p_group uuid) RETURNS uuid
LANGUAGE sql AS $fn$
    INSERT INTO transaction (user_id, type_id, date_transacted, group_id)
    VALUES (p_user, p_type, p_date, p_group) RETURNING id;
$fn$;

CREATE OR REPLACE FUNCTION _entry(p_tx uuid, p_asset int, p_account uuid, p_qty numeric, p_cat int) RETURNS void
LANGUAGE sql AS $fn$
    INSERT INTO entry (transaction_id, asset_id, account_id, quantity, category_id)
    VALUES (p_tx, p_asset, p_account, p_qty, p_cat);
$fn$;

CREATE OR REPLACE FUNCTION _desc(p_tx uuid, p_d text) RETURNS void
LANGUAGE sql AS $fn$
    INSERT INTO transaction_descriptions (transaction_id, description) VALUES (p_tx, p_d);
$fn$;

-- Composite inserters return false when the date is in the future (the current month never spills
-- past today); callers only advance their balance trackers on true so the model stays in sync.
CREATE OR REPLACE FUNCTION _spend(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_cat int, p_date timestamptz, p_desc text) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 1, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, -abs(p_amt), p_cat);
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _income(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_cat int, p_date timestamptz, p_desc text) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 1, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, abs(p_amt), p_cat);
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _cashin(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_date timestamptz, p_desc text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 3, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, abs(p_amt), 5);
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _cashout(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_date timestamptz, p_desc text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 2, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, -abs(p_amt), 9);
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _cashxfer(p_user uuid, p_from uuid, p_to uuid, p_ccy int, p_amt numeric, p_cat int, p_date timestamptz) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 13, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_from, -abs(p_amt), p_cat);
    PERFORM _entry(t, p_ccy, p_to, abs(p_amt), p_cat);
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _buy(p_user uuid, p_acct uuid, p_asset int, p_units numeric, p_ccy int, p_cost numeric, p_fee numeric, p_date timestamptz, p_desc text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 9, p_date, NULL);
    PERFORM _entry(t, p_asset, p_acct, abs(p_units), 3);
    PERFORM _entry(t, p_ccy, p_acct, -abs(p_cost), 3);
    IF p_fee > 0 THEN PERFORM _entry(t, p_ccy, p_acct, -abs(p_fee), 2); END IF;
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _sell(p_user uuid, p_acct uuid, p_asset int, p_units numeric, p_ccy int, p_proceeds numeric, p_fee numeric, p_date timestamptz, p_desc text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 8, p_date, NULL);
    PERFORM _entry(t, p_asset, p_acct, -abs(p_units), 4);
    PERFORM _entry(t, p_ccy, p_acct, abs(p_proceeds), 4);
    IF p_fee > 0 THEN PERFORM _entry(t, p_ccy, p_acct, -abs(p_fee), 2); END IF;
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _trade(p_user uuid, p_acct uuid, p_out int, p_out_units numeric, p_in int, p_in_units numeric, p_ccy int, p_fee numeric, p_date timestamptz, p_desc text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 7, p_date, NULL);
    PERFORM _entry(t, p_out, p_acct, -abs(p_out_units), 12);
    PERFORM _entry(t, p_in, p_acct, abs(p_in_units), 12);
    IF p_fee > 0 THEN PERFORM _entry(t, p_ccy, p_acct, -abs(p_fee), 1); END IF;
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _xferin(p_user uuid, p_acct uuid, p_asset int, p_units numeric, p_date timestamptz, p_desc text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 6, p_date, NULL);
    PERFORM _entry(t, p_asset, p_acct, abs(p_units), 11);
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _xferout(p_user uuid, p_acct uuid, p_asset int, p_units numeric, p_date timestamptz, p_desc text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 5, p_date, NULL);
    PERFORM _entry(t, p_asset, p_acct, -abs(p_units), 10);
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _balxfer(p_user uuid, p_from uuid, p_to uuid, p_asset int, p_units numeric, p_date timestamptz, p_desc text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 11, p_date, NULL);
    PERFORM _entry(t, p_asset, p_from, -abs(p_units), 13);
    PERFORM _entry(t, p_asset, p_to, abs(p_units), 13);
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _cashdiv(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_source int, p_withhold numeric, p_date timestamptz) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 4, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, abs(p_amt), 6);
    IF p_withhold > 0 THEN PERFORM _entry(t, p_ccy, p_acct, -abs(p_withhold), 8); END IF;
    INSERT INTO transaction_dividends (transaction_id, source_asset_id) VALUES (t, p_source);
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _assetdiv(p_user uuid, p_acct uuid, p_asset int, p_units numeric, p_date timestamptz, p_desc text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 10, p_date, NULL);
    PERFORM _entry(t, p_asset, p_acct, abs(p_units), 7);
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _acctfee(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_date timestamptz, p_desc text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN false; END IF;
    t := _tx(p_user, 12, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, -abs(p_amt), 14);
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
    RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION _cat(p_name text, p_fallback int) RETURNS int
LANGUAGE sql AS $fn$
    SELECT COALESCE(
        (SELECT id FROM transaction_categories WHERE user_id IS NULL AND LOWER(category) = LOWER(p_name)),
        p_fallback);
$fn$;

DO $do$
DECLARE
    v_user uuid := '00000000-0000-0000-0000-000000000000';
    v_now  timestamptz := now();
    v_day0 timestamptz;
    gbp int; usd int; eur int;
    vwrp int; aapl int; btc int; eth int; flat int; avgg int;
    pr_flat int; pr_avgg int; pr_vwrp int; pr_aapl int; pr_btc int; pr_eth int; pr_usdgbp int;

    acc_current uuid := '11111111-1111-1111-1111-111111111101';
    acc_savings uuid := '11111111-1111-1111-1111-111111111102';
    acc_joint   uuid := '11111111-1111-1111-1111-111111111103';
    acc_isa     uuid := '11111111-1111-1111-1111-111111111104';
    acc_ib      uuid := '11111111-1111-1111-1111-111111111105';
    acc_pension uuid := '11111111-1111-1111-1111-111111111106';
    acc_coin    uuid := '11111111-1111-1111-1111-111111111107';
    acc_ledger  uuid := '11111111-1111-1111-1111-111111111108';
    acc_amex    uuid := '11111111-1111-1111-1111-111111111109';
    acc_mort    uuid := '11111111-1111-1111-1111-111111111110';
    acc_home    uuid := '11111111-1111-1111-1111-111111111111';
    acc_cash    uuid := '11111111-1111-1111-1111-111111111112';

    cat_salary int; cat_bonus int; cat_freelance int; cat_interest int; cat_sideinc int;
    cat_mortint int; cat_homemaint int; cat_vehicle int;
    ctype_hobby int; cat_photo int; cat_running int;
    cat_cbt int;
    cat_groceries int; cat_cafes int; cat_restaurants int; cat_takeaway int; cat_alcohol int;
    cat_fuel int; cat_pubtrans int; cat_taxi int; cat_subs int; cat_pharmacy int; cat_gym int;
    cat_clothing int; cat_tech int; cat_flights int; cat_accom int; cat_entertain int;
    cat_gifts int; cat_education int; cat_insurance int; cat_vehmaint int; cat_household int;
    cat_misc int; cat_electricity int; cat_water int; cat_internet int; cat_mobile int; cat_counciltax int;
    cat_delivery int; cat_dentist int; cat_optical int; cat_hair int; cat_nightlife int; cat_books int;

    d int; sd int; day timestamptz; ts timestamptz; m int; mo int; dow int; dom int;
    pay_dom int; pay_date date; n int; i int; used int[]; r record;
    amt numeric; px numeric; units numeric; need numeric; fxr numeric;
    grp uuid; t uuid; ok boolean;

    bal_cur numeric := 0; bal_sav numeric := 0; bal_joint numeric := 0;
    bal_cashgbp numeric := 0; ib_usd numeric := 0; cb_usd numeric := 0;
    amex_owed numeric := 0; amex_stmt numeric := 0;
    aapl_sh numeric := 0; div_i int := 0;
    salary numeric; contrib numeric; isa_amt numeric; sav_amt numeric;
    principal numeric; interest numeric;
    bad boolean;
BEGIN
    IF EXISTS (SELECT 1 FROM account WHERE user_id = v_user) THEN
        RAISE NOTICE 'Showcase data already present for default user, skipping.';
        RETURN;
    END IF;

    PERFORM setseed(0.424242);

    INSERT INTO users (id, username, default_asset) VALUES (v_user, 'User', NULL) ON CONFLICT (id) DO NOTHING;
    INSERT INTO user_role_assignments (user_id, role_id) VALUES (v_user, 2) ON CONFLICT DO NOTHING;

    SELECT id INTO gbp FROM assets WHERE ticker = 'GBP';
    SELECT id INTO usd FROM assets WHERE ticker = 'USD';
    SELECT id INTO eur FROM assets WHERE ticker = 'EUR';

    UPDATE users SET default_asset = gbp, onboarding_version = 1 WHERE id = v_user;

    -- A rateless direct crypto->fiat pair shadows the two-hop USD valuation route and nulls the
    -- asset out of holdings and the chart. Remove any such orphans before creating holdings.
    DELETE FROM asset_pairs p USING assets a1, assets a2
        WHERE p.pair1 = a1.id AND p.pair2 = a2.id
          AND a1.ticker IN ('BTC', 'ETH') AND a2.ticker IN ('GBP', 'EUR', 'BTC', 'ETH')
          AND NOT EXISTS (SELECT 1 FROM asset_history h WHERE h.pair_id = p.id)
          AND NOT EXISTS (SELECT 1 FROM asset_pairs_shared_metadata sm WHERE sm.pair_id = p.id)
          AND NOT EXISTS (SELECT 1 FROM asset_pairs_user_metadata um WHERE um.pair_id = p.id);

    -- Assets (listed upserted as shared; flat + pension fund as custom user assets).
    vwrp := _seed_asset(5, 'Vanguard FTSE All-World UCITS ETF (Acc)', 'VWRP.LSE', 'IE00BK5BQT80', gbp, NULL);
    aapl := _seed_asset(2, 'Apple Inc.', 'AAPL.NASDAQ', 'US0378331005', usd, NULL);
    btc  := _seed_asset(7, 'Bitcoin', 'BTC', NULL, usd, NULL);
    eth  := _seed_asset(7, 'Ethereum', 'ETH', NULL, usd, NULL);
    flat := _seed_asset(8, 'Flat 12, Wren House E17', 'FLAT.LON', NULL, gbp, v_user);
    avgg := _seed_asset(4, 'Aviva Global Growth Pension Fund', 'AVGG.PN', NULL, gbp, v_user);

    pr_flat := _seed_pair_id(flat, gbp);
    pr_avgg := _seed_pair_id(avgg, gbp);
    pr_vwrp := _seed_pair_id(vwrp, gbp);
    pr_aapl := _seed_pair_id(aapl, usd);
    pr_btc  := _seed_pair_id(btc, usd);
    pr_eth  := _seed_pair_id(eth, usd);
    pr_usdgbp := _seed_pair_id(usd, gbp);

    -- Rate history is seeded ONLY for custom assets, which have no market feed. Listed assets
    -- (VWRP, AAPL, BTC, ETH) and the FX crosses are priced from the market-data service by the
    -- worker's backfill/refresh jobs; their pairs just need to exist and be held.

    -- Real estate: bimonthly appraisals - rise, peak, correction during the bad quarter, recovery.
    PERFORM _seed_flat_rates(pr_flat, ARRAY[296000,300000,305000,310000,314000,318000,310000,304000,308000,312000,320000,326000,328000], 2);
    -- Pension fund NAV: daily Brownian bridge 1.80 -> 2.42 with an -8.5% dip around month 14.
    PERFORM _seed_gbm(pr_avgg, 732, 1.80, 2.42, 0.09, 0.60, 0.085);

    -- Accounts (account_type ids: 1 Current, 2 Savings, 3 Investment, 4 Credit, 6 Workplace Pension,
    -- 7 Mortgage, 9 Real Estate, 10 Crypto Wallet, 11 Cash; liquidity 1 = Liquid).
    -- Joint bills, mortgage, and home are shared 50/50 with the partner: full amounts are stored,
    -- the app scales by ownership_share at read time.
    INSERT INTO account (id, user_id, account_name, account_type, liquidity_type, ownership_share) VALUES
        (acc_current, v_user, 'Lloyds Current Account',    1, 1, 1.0),
        (acc_savings, v_user, 'Marcus Savings',            2, 1, 1.0),
        (acc_joint,   v_user, 'Joint Bills - Starling',    1, 1, 0.5),
        (acc_isa,     v_user, 'Trading 212 ISA',           3, 1, 1.0),
        (acc_ib,      v_user, 'Interactive Brokers',       3, 1, 1.0),
        (acc_pension, v_user, 'Aviva Workplace Pension',   6, 1, 1.0),
        (acc_coin,    v_user, 'Coinbase',                 10, 1, 1.0),
        (acc_ledger,  v_user, 'Ledger Cold Wallet',       10, 1, 1.0),
        (acc_amex,    v_user, 'Amex Credit Card',          4, 1, 1.0),
        (acc_mort,    v_user, 'Halifax Mortgage',          7, 1, 0.5),
        (acc_home,    v_user, 'Home',                      9, 1, 0.5),
        (acc_cash,    v_user, 'Cash Wallet',              11, 1, 1.0);

    -- Custom income categories (built-in Income type ships empty), custom expense categories, and a
    -- custom category type with its own categories.
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Salary', 'wallet', 1, v_user) RETURNING id INTO cat_salary;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Bonus', 'gift', 1, v_user) RETURNING id INTO cat_bonus;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Freelance', 'laptop', 1, v_user) RETURNING id INTO cat_freelance;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Interest', 'piggy-bank', 1, v_user) RETURNING id INTO cat_interest;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Side Income', 'coins', 1, v_user) RETURNING id INTO cat_sideinc;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Mortgage Interest', 'home', 5, v_user) RETURNING id INTO cat_mortint;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Vehicle Purchase', 'car', 6, v_user) RETURNING id INTO cat_vehicle;
    INSERT INTO transaction_category_type (category_type_name, user_id) VALUES ('Hobbies & Side Projects', v_user) RETURNING id INTO ctype_hobby;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Photography Gear', 'camera', ctype_hobby, v_user) RETURNING id INTO cat_photo;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Running & Races', 'footprints', ctype_hobby, v_user) RETURNING id INTO cat_running;

    -- Built-in category ids resolved by name with audited fallbacks.
    cat_cbt         := _cat('Cash Balance Transfer', 79);
    cat_groceries   := _cat('Groceries', 25);
    cat_cafes       := _cat('Cafes & Coffee', 27);
    cat_restaurants := _cat('Restaurants', 26);
    cat_takeaway    := _cat('Fast Food & Takeaway', 28);
    cat_alcohol     := _cat('Alcohol & Bars', 26);
    cat_fuel        := _cat('Fuel', 20);
    cat_pubtrans    := _cat('Public Transport', 21);
    cat_taxi        := _cat('Ride Sharing & Taxis', 24);
    cat_subs        := _cat('Subscriptions', 37);
    cat_pharmacy    := _cat('Pharmacy & Medication', 40);
    cat_gym         := _cat('Fitness & Gym', 42);
    cat_clothing    := _cat('Clothing & Accessories', 52);
    cat_tech        := _cat('Electronics & Technology', 53);
    cat_flights     := _cat('Flights', 61);
    cat_accom       := _cat('Accommodation', 62);
    cat_entertain   := _cat('Events & Concerts', 76);
    cat_gifts       := _cat('Gifts', 76);
    cat_education   := _cat('Courses & Training', 76);
    cat_insurance   := _cat('Vehicle Insurance', 76);
    cat_vehmaint    := _cat('Vehicle Maintenance', 20);
    cat_household   := _cat('Home & Household', 76);
    cat_homemaint   := _cat('Home Maintenance & Repairs', 76);
    cat_delivery    := _cat('Food Delivery', 28);
    cat_dentist     := _cat('Dentist', 40);
    cat_optical     := _cat('Optical & Vision', 40);
    cat_hair        := _cat('Hair & Beauty', 40);
    cat_nightlife   := _cat('Nightlife & Social', 76);
    cat_books       := _cat('Books & Media', 76);
    cat_misc        := _cat('Miscellaneous', 76);
    cat_electricity := _cat('Electricity', 32);
    cat_water       := _cat('Water', 34);
    cat_internet    := _cat('Internet', 35);
    cat_mobile      := _cat('Phone & Mobile', 36);
    cat_counciltax  := _cat('Property Tax', 70);

    -- Merchant pool: weighted, day-of-week gated, month-window gated (m_from/m_to), with per-day
    -- exclusion in the loop so no merchant repeats within a day.
    CREATE TEMP TABLE _m (
        id int, merchant text, cat int, kind text, acct text,
        lo numeric, hi numeric, w numeric, dows int[], hlo int, hhi int, m_from int, m_to int
    ) ON COMMIT DROP;
    INSERT INTO _m VALUES
        ( 1, 'Pret a Manger',          cat_cafes,       'coffee',    'cur',  2.80,  4.60, 3.0, '{1,2,3,4,5}',   7, 11,  0, 99),
        ( 2, 'Costa Coffee',           cat_cafes,       'coffee',    'cur',  2.95,  4.40, 2.5, '{1,2,3,4,5,6}', 7, 12,  0, 99),
        ( 3, 'Caffe Nero',             cat_cafes,       'coffee',    'cur',  3.10,  4.80, 2.0, '{1,2,3,4,5,6,7}', 8, 13, 0, 99),
        ( 4, 'Black Sheep Coffee',     cat_cafes,       'coffee',    'cur',  3.40,  5.20, 1.5, '{1,2,3,4,5}',   7, 11,  0, 99),
        ( 5, 'Gail''s Bakery',         cat_cafes,       'coffee',    'cur',  4.20,  9.80, 1.0, '{6,7}',         9, 12,  0, 99),
        ( 6, 'WatchHouse Coffee',      cat_cafes,       'coffee',    'cur',  3.80,  6.40, 0.6, '{1,2,3,4,5,6,7}', 8, 12, 0, 99),
        ( 7, 'Tesco',                  cat_groceries,   'grocery',   'cur', 18.00, 72.00, 3.0, '{1,2,3,4,5,6,7}', 10, 20, 0, 99),
        ( 8, 'Sainsbury''s',           cat_groceries,   'grocery',   'cur', 15.00, 64.00, 2.5, '{1,2,3,4,5,6,7}', 10, 20, 0, 99),
        ( 9, 'Lidl',                   cat_groceries,   'grocery',   'cur', 12.00, 48.00, 2.0, '{1,2,3,4,5,6,7}', 10, 19, 0, 99),
        (10, 'Aldi',                   cat_groceries,   'grocery',   'cur', 11.00, 44.00, 1.5, '{1,2,3,4,5,6,7}', 10, 19, 0, 99),
        (11, 'Co-op',                  cat_groceries,   'grocery',   'cur',  4.00, 18.00, 1.5, '{1,2,3,4,5,6,7}', 8, 21, 0, 99),
        (12, 'Tesco Express',          cat_groceries,   'grocery',   'cur',  3.50, 15.00, 1.5, '{1,2,3,4,5,6,7}', 8, 21, 0, 99),
        (13, 'M&S Food',               cat_groceries,   'grocery',   'cur',  8.00, 32.00, 0.8, '{1,2,3,4,5,6,7}', 11, 19, 0, 99),
        (14, 'Waitrose',               cat_groceries,   'grocery',   'cur', 14.00, 58.00, 0.4, '{6,7}',         10, 18, 0, 99),
        (15, 'Ocado',                  cat_groceries,   'grocery',   'cur', 82.00, 128.00, 0.5, '{4}',          17, 21, 0, 99),
        (16, 'Dishoom',                cat_restaurants, 'restaurant','amex', 38.00, 74.00, 1.5, '{5,6}',        19, 22, 0, 99),
        (17, 'Nando''s',               cat_restaurants, 'restaurant','amex', 22.00, 41.00, 1.5, '{5,6,7}',      18, 21, 0, 99),
        (18, 'Franco Manca',           cat_restaurants, 'restaurant','amex', 18.00, 34.00, 1.2, '{5,6}',        18, 21, 0, 99),
        (19, 'Honest Burgers',         cat_restaurants, 'restaurant','amex', 24.00, 44.00, 1.0, '{5,6}',        18, 22, 0, 99),
        (20, 'Turkish Kitchen E17',    cat_restaurants, 'restaurant','amex', 28.00, 52.00, 0.8, '{5,6}',        18, 21, 0, 99),
        (21, 'The Breakfast Club',     cat_restaurants, 'restaurant','amex', 16.00, 29.00, 0.8, '{6,7}',        10, 13, 0, 99),
        (22, 'Padella',                cat_restaurants, 'restaurant','amex', 26.00, 48.00, 0.5, '{5,6}',        18, 21, 0, 99),
        (23, 'The Crown & Anchor',     cat_alcohol,     'pub',       'amex', 12.00, 38.00, 1.5, '{5,6}',        17, 23, 0, 99),
        (24, 'BrewDog Shoreditch',     cat_alcohol,     'pub',       'amex', 14.00, 42.00, 1.0, '{5,6}',        18, 23, 0, 99),
        (25, 'The Old Ship E17',       cat_alcohol,     'pub',       'amex',  9.00, 28.00, 0.8, '{5,6,7}',      16, 22, 0, 99),
        (26, 'Deliveroo',              cat_delivery,    'takeaway',  'cur', 14.00, 34.00, 2.0, '{3,7}',         18, 21, 0, 99),
        (27, 'Uber Eats',              cat_delivery,    'takeaway',  'cur', 13.00, 31.00, 1.5, '{1,2,4,5,6,7}', 18, 21, 0, 99),
        (28, 'Greggs',                 cat_takeaway,    'takeaway',  'cur',  2.60,  7.40, 2.0, '{1,2,3,4,5}',   7, 13,  0, 99),
        (29, 'McDonald''s',            cat_takeaway,    'takeaway',  'cur',  6.00, 14.00, 1.0, '{1,2,3,4,5,6,7}', 11, 22, 0, 99),
        (30, 'Five Guys',              cat_takeaway,    'takeaway',  'cur', 12.00, 22.00, 0.5, '{5,6,7}',       12, 20, 0, 99),
        (31, 'TfL Travel',             cat_pubtrans,    'transport', 'cur',  2.80,  8.40, 4.0, '{1,2,3,4,5}',   7, 9,   0, 14),
        (32, 'TfL Travel',             cat_pubtrans,    'transport', 'cur',  2.80,  8.40, 2.5, '{1,2,3,4,5}',   7, 9,  14, 99),
        (33, 'Trainline',              cat_pubtrans,    'transport', 'cur', 12.00, 48.00, 0.6, '{1,5,6,7}',     8, 18,  0, 99),
        (34, 'Uber',                   cat_taxi,        'taxi',      'cur',  8.00, 24.00, 1.2, '{5,6}',         21, 23, 0, 99),
        (35, 'Bolt',                   cat_taxi,        'taxi',      'cur',  7.00, 19.00, 0.8, '{5,6,7}',       20, 23, 0, 99),
        (36, 'Shell Walthamstow',      cat_fuel,        'fuel',      'cur', 42.00, 78.00, 1.5, '{1,2,3,4,5,6,7}', 8, 19, 14, 99),
        (37, 'BP Leyton',              cat_fuel,        'fuel',      'cur', 40.00, 74.00, 1.2, '{1,2,3,4,5,6,7}', 8, 19, 14, 99),
        (38, 'Tesco Petrol',           cat_fuel,        'fuel',      'cur', 38.00, 68.00, 1.0, '{6,7}',         10, 18, 14, 99),
        (39, 'Amazon',                 cat_tech,        'shopping',  'amex',  8.00, 60.00, 2.0, '{1,2,3,4,5,6,7}', 12, 22, 0, 99),
        (40, 'Uniqlo',                 cat_clothing,    'shopping',  'amex', 24.00, 85.00, 0.8, '{6,7}',        12, 18, 0, 99),
        (41, 'Zara',                   cat_clothing,    'shopping',  'amex', 28.00, 95.00, 0.7, '{6,7}',        12, 18, 0, 99),
        (42, 'M&S',                    cat_clothing,    'shopping',  'cur', 18.00, 70.00, 0.7, '{6,7}',         11, 18, 0, 99),
        (43, 'Currys',                 cat_tech,        'shopping',  'amex', 45.00, 260.00, 0.4, '{6,7}',       12, 18, 0, 99),
        (44, 'Argos',                  cat_household,   'shopping',  'cur', 15.00, 80.00, 0.5, '{6,7}',         11, 18, 0, 99),
        (45, 'IKEA Tottenham',         cat_household,   'shopping',  'cur', 22.00, 140.00, 0.4, '{6,7}',        11, 17, 0, 99),
        (46, 'John Lewis',             cat_household,   'shopping',  'amex', 25.00, 120.00, 0.4, '{6,7}',       11, 18, 0, 99),
        (47, 'Decathlon',              cat_clothing,    'shopping',  'cur', 15.00, 90.00, 0.5, '{6,7}',         11, 18, 0, 99),
        (48, 'Boots',                  cat_pharmacy,    'pharmacy',  'cur',  4.00, 22.00, 1.2, '{1,2,3,4,5,6}', 9, 19,  0, 99),
        (49, 'Superdrug',              cat_pharmacy,    'pharmacy',  'cur',  3.50, 16.00, 0.8, '{1,2,3,4,5,6}', 9, 19,  0, 99),
        (50, 'Ruffians Barbers',       cat_hair,        'personal',  'cash', 24.00, 38.00, 0.6, '{2,3,4,5,6}', 10, 18,  0, 99),
        (51, 'Vue Cinema',             cat_entertain,   'entertainment', 'amex', 11.00, 26.00, 0.8, '{5,6,7}', 17, 21,  0, 99),
        (52, 'Odeon',                  cat_entertain,   'entertainment', 'amex', 12.00, 24.00, 0.5, '{5,6,7}', 17, 21,  0, 99),
        (53, 'Lane7 Bowling',          cat_entertain,   'entertainment', 'amex', 14.00, 32.00, 0.4, '{5,6}',   18, 22,  0, 99),
        (54, 'Waterstones',            cat_books,       'entertainment', 'cur',  8.00, 24.00, 0.5, '{6,7}',    11, 17,  0, 99),
        (55, 'Post Office',            cat_misc,        'misc',      'cur',  2.00, 12.00, 0.5, '{1,2,3,4,5,6}', 9, 16,  0, 99),
        (56, 'Walthamstow Farmers'' Market', cat_groceries, 'market','cash',  6.00, 18.00, 0.6, '{7}',         10, 13,  0, 99),
        (57, 'Timpson',                cat_misc,        'misc',      'cur',  6.00, 15.00, 0.3, '{1,2,3,4,5,6}', 9, 17,  0, 99),
        (58, 'B&Q',                    cat_homemaint,   'shopping',  'cur', 12.00, 85.00, 0.4, '{6,7}',        10, 17,  0, 99),
        (59, 'Screwfix',               cat_homemaint,   'shopping',  'cur',  8.00, 45.00, 0.3, '{6,7}',         9, 16,  0, 99);

    -- Opening balances: one shared timestamp before any other event, so the ALL-range chart's first
    -- tick captures the whole opening position (cash + pension transfer-in + home + mortgage) as a
    -- single sane net worth.
    v_day0 := date_trunc('day', v_now) - interval '729 days' + interval '15 minutes';
    PERFORM _cashin(v_user, acc_current, gbp, 2000, v_day0, 'Opening balance');
    PERFORM _cashin(v_user, acc_savings, gbp, 22500, v_day0, 'Opening balance');
    PERFORM _cashin(v_user, acc_joint,   gbp, 2600, v_day0, 'Opening balance');
    PERFORM _cashin(v_user, acc_cash,    gbp, 120,  v_day0);
    PERFORM _cashin(v_user, acc_ib,      usd, 1200, v_day0, 'Opening balance');
    PERFORM _cashout(v_user, acc_mort,   gbp, 178000, v_day0, 'Mortgage principal at purchase');
    PERFORM _xferin(v_user, acc_home, flat, 1, v_day0, 'Flat 12, Wren House - 50/50 with Sam');
    PERFORM _xferin(v_user, acc_pension, avgg, 8055.5560, v_day0, 'Transfer from previous employer scheme');
    bal_cur := 2000; bal_sav := 22500; bal_joint := 2600; bal_cashgbp := 120; ib_usd := 1200;

    FOR d IN REVERSE 729..0 LOOP
        day := date_trunc('day', v_now) - make_interval(days => d);
        sd  := 729 - d;
        m   := sd / 30;
        mo  := EXTRACT(MONTH FROM day)::int;
        dow := EXTRACT(ISODOW FROM day)::int;
        dom := EXTRACT(DAY FROM day)::int;
        used := '{}';

        salary  := CASE WHEN m >= 16 THEN 3560 WHEN m >= 12 THEN 3250 ELSE 3050 END;
        contrib := CASE WHEN m >= 16 THEN 560 ELSE 520 END;
        isa_amt := CASE WHEN m >= 9 THEN 500 ELSE 300 END;
        sav_amt := CASE WHEN m >= 12 THEN 550 ELSE 400 END;

        -- Payday: 25th (20th in December), shifted to the previous Friday from a weekend.
        pay_date := make_date(EXTRACT(YEAR FROM day)::int, mo, CASE WHEN mo = 12 THEN 20 ELSE 25 END);
        pay_date := pay_date - CASE EXTRACT(ISODOW FROM pay_date)::int WHEN 6 THEN 1 WHEN 7 THEN 2 ELSE 0 END;
        pay_dom := EXTRACT(DAY FROM pay_date)::int;

        -- ── Scheduled engine ────────────────────────────────────────────────
        IF sd > 0 THEN
            IF dom = 1 THEN
                interest  := round(1284 - (595 + 1.5 * m), 2);
                principal := round(595 + 1.5 * m, 2);
                IF _spend(v_user, acc_joint, gbp, interest, cat_mortint, day + interval '7 hours', 'Halifax mortgage - interest') THEN
                    bal_joint := bal_joint - interest;
                END IF;
                IF _cashxfer(v_user, acc_joint, acc_mort, gbp, principal, cat_cbt, day + interval '7 hours 5 minutes') THEN
                    bal_joint := bal_joint - principal;
                END IF;
                IF _spend(v_user, acc_current, gbp, 27.99, cat_gym, day + interval '8 hours', 'PureGym membership') THEN
                    bal_cur := bal_cur - 27.99;
                END IF;
                IF _spend(v_user, acc_joint, gbp, 14.54, cat_subs, day + interval '8 hours', 'TV Licence') THEN
                    bal_joint := bal_joint - 14.54;
                END IF;
            END IF;
            IF dom = 4 AND mo NOT IN (2, 3) THEN
                IF _spend(v_user, acc_joint, gbp, 186.00, cat_counciltax, day + interval '7 hours', 'Waltham Forest council tax') THEN
                    bal_joint := bal_joint - 186.00;
                END IF;
            END IF;
            IF dom = 5 THEN
                amt := _rnd2(62 * CASE WHEN mo IN (12,1,2) THEN 2.0 WHEN mo IN (11,3) THEN 1.5 WHEN mo IN (4,10) THEN 1.15 ELSE 0.85 END,
                             74 * CASE WHEN mo IN (12,1,2) THEN 2.0 WHEN mo IN (11,3) THEN 1.5 WHEN mo IN (4,10) THEN 1.15 ELSE 0.85 END);
                IF _spend(v_user, acc_joint, gbp, amt, cat_electricity, day + interval '7 hours', 'Octopus Energy') THEN
                    bal_joint := bal_joint - amt;
                END IF;
            END IF;
            IF dom = 7 THEN
                IF _spend(v_user, acc_joint, gbp, 38.20, cat_water, day + interval '7 hours', 'Thames Water') THEN
                    bal_joint := bal_joint - 38.20;
                END IF;
            END IF;
            IF dom = 9 THEN
                IF _spend(v_user, acc_joint, gbp, 33.00, cat_internet, day + interval '7 hours', 'Hyperoptic broadband') THEN
                    bal_joint := bal_joint - 33.00;
                END IF;
            END IF;
            IF dom = 11 THEN
                IF _spend(v_user, acc_current, gbp, 16.90, cat_mobile, day + interval '8 hours', 'EE mobile') THEN
                    bal_cur := bal_cur - 16.90;
                END IF;
            END IF;
            IF dom = 14 THEN
                amex_stmt := amex_owed;
            END IF;
            IF dom = 15 THEN
                amt := CASE WHEN m >= 14 THEN 13.99 ELSE 12.99 END;
                IF _spend(v_user, acc_amex, gbp, amt, cat_subs, day + interval '6 hours', 'Netflix') THEN amex_owed := amex_owed + amt; END IF;
            END IF;
            IF dom = 16 THEN
                IF _spend(v_user, acc_amex, gbp, 11.99, cat_subs, day + interval '6 hours', 'Spotify') THEN amex_owed := amex_owed + 11.99; END IF;
                IF _spend(v_user, acc_amex, gbp, 2.99, cat_subs, day + interval '6 hours 10 minutes', 'iCloud storage') THEN amex_owed := amex_owed + 2.99; END IF;
            END IF;
            IF dom = 17 AND m >= 10 THEN
                IF _spend(v_user, acc_amex, gbp, 12.99, cat_subs, day + interval '6 hours', 'YouTube Premium') THEN amex_owed := amex_owed + 12.99; END IF;
            END IF;
            IF dom = pay_dom THEN
                IF _income(v_user, acc_current, gbp, salary, cat_salary, day + interval '6 hours',
                           CASE WHEN m >= 16 THEN 'Salary - Novabank' ELSE 'Salary - Meridian Analytics' END) THEN
                    bal_cur := bal_cur + salary;
                END IF;
                px := _rate_on(pr_avgg, day, 2.0);
                PERFORM _xferin(v_user, acc_pension, avgg, round(contrib / px, 4), day + interval '6 hours 5 minutes', 'Employer pension contribution');
                IF _cashin(v_user, acc_joint, gbp, 895, day + interval '9 hours', 'Partner contribution - Sam') THEN
                    bal_joint := bal_joint + 895;
                END IF;
                IF _cashxfer(v_user, acc_current, acc_joint, gbp, 895, cat_cbt, day + interval '9 hours 10 minutes') THEN
                    bal_cur := bal_cur - 895; bal_joint := bal_joint + 895;
                END IF;
            END IF;
            IF dom = pay_dom + 1 THEN
                IF _cashxfer(v_user, acc_current, acc_savings, gbp, sav_amt, cat_cbt, day + interval '7 hours') THEN
                    bal_cur := bal_cur - sav_amt; bal_sav := bal_sav + sav_amt;
                END IF;
                IF _cashxfer(v_user, acc_current, acc_isa, gbp, isa_amt, cat_cbt, day + interval '7 hours 5 minutes') THEN
                    bal_cur := bal_cur - isa_amt;
                END IF;
            END IF;
            IF dom = pay_dom + 2 THEN
                px := _rate_on(pr_vwrp, day, 96 + 1.5 * m);
                units := round(isa_amt / px, 4);
                PERFORM _buy(v_user, acc_isa, vwrp, units, gbp, isa_amt, 0, day + interval '8 hours');
                need := floor(GREATEST(bal_cur - 2600, 0) / 10) * 10;
                IF need >= 50 THEN
                    IF _cashxfer(v_user, acc_current, acc_savings, gbp, need, cat_cbt, day + interval '10 hours') THEN
                        bal_cur := bal_cur - need; bal_sav := bal_sav + need;
                    END IF;
                END IF;
            END IF;
            IF dom = 20 AND bal_cur < 700 AND bal_sav > 1000 THEN
                IF _cashxfer(v_user, acc_savings, acc_current, gbp, 400, cat_cbt, day + interval '9 hours') THEN
                    bal_sav := bal_sav - 400; bal_cur := bal_cur + 400;
                END IF;
            END IF;
            IF dom = 28 AND amex_stmt > 0 THEN
                IF _cashxfer(v_user, acc_current, acc_amex, gbp, round(amex_stmt, 2), cat_cbt, day + interval '7 hours') THEN
                    bal_cur := bal_cur - round(amex_stmt, 2); amex_owed := amex_owed - amex_stmt; amex_stmt := 0;
                END IF;
            END IF;
            IF EXTRACT(DAY FROM day + interval '1 day')::int = 1 THEN
                amt := round(bal_sav * 0.043 / 12, 2);
                IF _income(v_user, acc_savings, gbp, amt, cat_interest, day + interval '21 hours', 'Marcus monthly interest') THEN
                    bal_sav := bal_sav + amt;
                END IF;
            END IF;
            IF m IN (0, 3, 6, 9, 12, 15, 18, 21) AND sd = m * 30 + 2 THEN
                IF _acctfee(v_user, acc_ib, usd, 3.00, day + interval '5 hours', 'IBKR monthly minimum fee') THEN
                    ib_usd := ib_usd - 3.00;
                END IF;
            END IF;
            IF m IN (3, 6, 9, 12, 18, 21) AND sd = m * 30 + 1 THEN
                IF _cashxfer(v_user, acc_joint, acc_mort, gbp, 500, cat_cbt, day + interval '10 hours') THEN
                    bal_joint := bal_joint - 500;
                END IF;
            END IF;
            -- Cash top-up: every other month, keeps the wallet funded for barber/market spends.
            IF m % 2 = 0 AND sd = m * 30 + 13 THEN
                IF _cashxfer(v_user, acc_current, acc_cash, gbp, 80, cat_cbt, day + interval '12 hours') THEN
                    bal_cur := bal_cur - 80; bal_cashgbp := bal_cashgbp + 80;
                END IF;
            END IF;
        END IF;

        -- ── Scripted life & investment events (keyed by days-since-start) ──
        CASE sd
            WHEN 12 THEN
                IF _spend(v_user, acc_current, gbp, 65.00, cat_dentist, day + interval '14 hours', 'Dental check-up and hygienist') THEN bal_cur := bal_cur - 65; END IF;
            WHEN 41 THEN
                IF _spend(v_user, acc_amex, gbp, 380.00, cat_accom, day + interval '19 hours', 'Airbnb - long weekend in Cornwall') THEN amex_owed := amex_owed + 380; END IF;
            WHEN 63 THEN
                px := _rate_on(pr_btc, day, 58000);
                amt := round(0.05 * px, 2);
                need := ceil((amt + amt * 0.005 + 25 - cb_usd) / 25) * 25;
                IF need > 0 THEN
                    fxr := _rate_on(pr_usdgbp, day, 0.78);
                    IF _cashout(v_user, acc_savings, gbp, round(need * fxr, 2), day + interval '9 hours', 'Transfer to Coinbase') THEN bal_sav := bal_sav - round(need * fxr, 2); END IF;
                    IF _cashin(v_user, acc_coin, usd, need, day + interval '11 hours') THEN cb_usd := cb_usd + need; END IF;
                END IF;
                IF _buy(v_user, acc_coin, btc, 0.05, usd, amt, round(amt * 0.005, 2), day + interval '12 hours') THEN cb_usd := cb_usd - amt - round(amt * 0.005, 2); END IF;
            WHEN 64 THEN
                IF _income(v_user, acc_current, gbp, 240.00, cat_sideinc, day + interval '11 hours', 'Deposit refund from old letting agent - finally') THEN bal_cur := bal_cur + 240; END IF;
            WHEN 66 THEN
                IF _acctfee(v_user, acc_amex, gbp, 140.00, day + interval '6 hours', 'Amex annual fee') THEN amex_owed := amex_owed + 140; END IF;
            WHEN 68 THEN
                px := _rate_on(pr_aapl, day, 220);
                amt := round(14 * px, 2);
                need := ceil((amt + 1 + 150 - ib_usd) / 50) * 50;
                IF need > 0 THEN
                    fxr := _rate_on(pr_usdgbp, day, 0.78);
                    IF _cashout(v_user, acc_savings, gbp, round(need * fxr, 2), day + interval '9 hours', 'Wise transfer to Interactive Brokers') THEN bal_sav := bal_sav - round(need * fxr, 2); END IF;
                    IF _cashin(v_user, acc_ib, usd, need, day + interval '11 hours') THEN ib_usd := ib_usd + need; END IF;
                END IF;
                IF _buy(v_user, acc_ib, aapl, 14, usd, amt, 1.00, day + interval '14 hours 30 minutes') THEN ib_usd := ib_usd - amt - 1.00; aapl_sh := aapl_sh + 14; END IF;
            WHEN 98 THEN
                IF _income(v_user, acc_current, gbp, 340.00, cat_freelance, day + interval '18 hours', 'Invoice #0041 - freelance site build') THEN bal_cur := bal_cur + 340; END IF;
            WHEN 129 THEN
                px := _rate_on(pr_eth, day, 3150);
                amt := round(0.5 * px, 2);
                need := ceil((amt + amt * 0.005 + 25 - cb_usd) / 25) * 25;
                IF need > 0 THEN
                    fxr := _rate_on(pr_usdgbp, day, 0.78);
                    IF _cashout(v_user, acc_savings, gbp, round(need * fxr, 2), day + interval '9 hours', 'Transfer to Coinbase') THEN bal_sav := bal_sav - round(need * fxr, 2); END IF;
                    IF _cashin(v_user, acc_coin, usd, need, day + interval '11 hours') THEN cb_usd := cb_usd + need; END IF;
                END IF;
                IF _buy(v_user, acc_coin, eth, 0.5, usd, amt, round(amt * 0.005, 2), day + interval '13 hours') THEN cb_usd := cb_usd - amt - round(amt * 0.005, 2); END IF;
            WHEN 158 THEN
                IF _income(v_user, acc_current, gbp, 420.00, cat_freelance, day + interval '19 hours', 'Invoice #0042 - freelance dashboard work') THEN bal_cur := bal_cur + 420; END IF;
            WHEN 186 THEN
                IF _spend(v_user, acc_current, gbp, 62.00, cat_running, day + interval '12 hours', 'Royal Parks Half - entry fee') THEN bal_cur := bal_cur - 62; END IF;
            WHEN 191 THEN
                px := _rate_on(pr_aapl, day, 228);
                amt := round(9 * px, 2);
                need := ceil((amt + 1 + 150 - ib_usd) / 50) * 50;
                IF need > 0 THEN
                    fxr := _rate_on(pr_usdgbp, day, 0.78);
                    IF _cashout(v_user, acc_savings, gbp, round(need * fxr, 2), day + interval '9 hours', 'Wise transfer to Interactive Brokers') THEN bal_sav := bal_sav - round(need * fxr, 2); END IF;
                    IF _cashin(v_user, acc_ib, usd, need, day + interval '11 hours') THEN ib_usd := ib_usd + need; END IF;
                END IF;
                IF _buy(v_user, acc_ib, aapl, 9, usd, amt, 1.00, day + interval '15 hours') THEN ib_usd := ib_usd - amt - 1.00; aapl_sh := aapl_sh + 9; END IF;
            WHEN 218 THEN
                IF _spend(v_user, acc_amex, gbp, 95.00, cat_subs, day + interval '7 hours', 'Amazon Prime annual') THEN amex_owed := amex_owed + 95; END IF;
            WHEN 255 THEN
                IF _spend(v_user, acc_current, gbp, 129.00, cat_running, day + interval '13 hours', 'New running shoes for the half marathon') THEN bal_cur := bal_cur - 129; END IF;
            WHEN 264 THEN
                IF _income(v_user, acc_current, gbp, 2800.00, cat_bonus, day + interval '6 hours', 'Annual performance bonus - Meridian') THEN bal_cur := bal_cur + 2800; END IF;
            WHEN 275 THEN
                IF _spend(v_user, acc_current, gbp, 120.00, cat_nightlife, day + interval '20 hours', 'Stag do in Newcastle - deposit') THEN bal_cur := bal_cur - 120; END IF;
            WHEN 310 THEN
                IF _cashout(v_user, acc_current, gbp, 150.00, day + interval '10 hours', 'Wedding gift for Jess & Tom') THEN bal_cur := bal_cur - 150; END IF;
            WHEN 325 THEN
                IF _spend(v_user, acc_amex, gbp, 85.00, cat_clothing, day + interval '13 hours', 'New suitcase for Lisbon') THEN amex_owed := amex_owed + 85; END IF;
            WHEN 328 THEN
                IF _cashxfer(v_user, acc_current, acc_cash, gbp, 410, cat_cbt, day + interval '10 hours') THEN bal_cur := bal_cur - 410; bal_cashgbp := bal_cashgbp + 410; END IF;
                IF _trade(v_user, acc_cash, gbp, 400, eur, 468, gbp, 3.50, day + interval '11 hours', 'Travel money - GBP to EUR') THEN bal_cashgbp := bal_cashgbp - 403.50; END IF;
            WHEN 330 THEN
                grp := uuidv7();
                INSERT INTO transaction_group (id, category_id, description, date_added) VALUES (grp, cat_flights, 'Lisbon week away', day);
                t := _tx(v_user, 1, day + interval '8 hours', grp);
                PERFORM _entry(t, gbp, acc_amex, -164.00, cat_flights); PERFORM _desc(t, 'easyJet - flights to Lisbon');
                amex_owed := amex_owed + 164;
                t := _tx(v_user, 1, day + interval '8 hours 10 minutes', grp);
                PERFORM _entry(t, gbp, acc_amex, -312.00, cat_accom); PERFORM _desc(t, 'Booking.com - Alfama guesthouse, 5 nights');
                amex_owed := amex_owed + 312;
                t := _tx(v_user, 1, day + interval '20 hours', grp);
                PERFORM _entry(t, gbp, acc_amex, -58.70, cat_restaurants); PERFORM _desc(t, 'Dinner at Time Out Market');
                amex_owed := amex_owed + 58.70;
            WHEN 333 THEN
                PERFORM _spend(v_user, acc_cash, eur, 8.40, cat_cafes, day + interval '10 hours', 'Pasteis de Belem');
                PERFORM _spend(v_user, acc_cash, eur, 14.00, cat_pubtrans, day + interval '11 hours', 'Tram 28 day passes');
                PERFORM _spend(v_user, acc_cash, eur, 61.30, cat_restaurants, day + interval '20 hours', 'Cervejaria Ramiro');
            WHEN 334 THEN
                PERFORM _spend(v_user, acc_cash, eur, 35.00, cat_entertain, day + interval '14 hours', 'Tuk-tuk tour of Alfama');
                PERFORM _spend(v_user, acc_cash, eur, 24.60, cat_restaurants, day + interval '13 hours', 'Lunch at LX Factory');
                PERFORM _spend(v_user, acc_cash, eur, 18.90, cat_taxi, day + interval '22 hours', 'Bolt to the hotel');
            WHEN 335 THEN
                PERFORM _spend(v_user, acc_cash, eur, 41.80, cat_restaurants, day + interval '19 hours', 'Time Out Market - second visit');
                PERFORM _spend(v_user, acc_cash, eur, 22.00, cat_entertain, day + interval '11 hours', 'MAAT museum tickets');
                PERFORM _spend(v_user, acc_cash, eur, 7.20, cat_cafes, day + interval '16 hours', 'Gelato by the river');
            WHEN 336 THEN
                PERFORM _spend(v_user, acc_cash, eur, 9.40, cat_pubtrans, day + interval '9 hours', 'Train to Cascais');
                PERFORM _spend(v_user, acc_cash, eur, 65.00, cat_entertain, day + interval '21 hours', 'Fado night in Alfama');
                PERFORM _spend(v_user, acc_cash, eur, 11.20, cat_taxi, day + interval '23 hours', 'Bolt back from Fado');
            WHEN 337 THEN
                PERFORM _spend(v_user, acc_cash, eur, 26.70, cat_groceries, day + interval '10 hours', 'Mercado da Ribeira picnic supplies');
                PERFORM _spend(v_user, acc_cash, eur, 18.50, cat_gifts, day + interval '15 hours', 'Azulejo tile souvenir for Mum');
                PERFORM _spend(v_user, acc_cash, eur, 18.00, cat_accom, day + interval '8 hours', 'Hotel city tax');
            WHEN 371 THEN
                IF _spend(v_user, acc_current, gbp, 68.00, cat_dentist, day + interval '14 hours', 'Dental check-up and hygienist') THEN bal_cur := bal_cur - 68; END IF;
            WHEN 372 THEN
                IF _spend(v_user, acc_amex, gbp, 389.00, cat_photo, day + interval '12 hours', 'Camera lens - WEX Photographic') THEN amex_owed := amex_owed + 389; END IF;
            WHEN 398 THEN
                IF _spend(v_user, acc_joint, gbp, 1380.00, cat_homemaint, day + interval '9 hours', 'Emergency boiler replacement - BoilerCare') THEN bal_joint := bal_joint - 1380; END IF;
            WHEN 404 THEN
                IF _spend(v_user, acc_current, gbp, 70.00, cat_education, day + interval '17 hours', 'Two refresher driving lessons before buying the car') THEN bal_cur := bal_cur - 70; END IF;
            WHEN 425 THEN
                PERFORM _assetdiv(v_user, acc_coin, eth, 0.0041, day + interval '4 hours', 'ETH staking reward');
            WHEN 426 THEN
                px := _rate_on(pr_aapl, day, 174);
                amt := round(11 * px, 2);
                need := ceil((amt + 1 + 150 - ib_usd) / 50) * 50;
                IF need > 0 THEN
                    fxr := _rate_on(pr_usdgbp, day, 0.78);
                    IF _cashout(v_user, acc_savings, gbp, round(need * fxr, 2), day + interval '9 hours', 'Wise transfer to Interactive Brokers') THEN bal_sav := bal_sav - round(need * fxr, 2); END IF;
                    IF _cashin(v_user, acc_ib, usd, need, day + interval '11 hours') THEN ib_usd := ib_usd + need; END IF;
                END IF;
                IF _buy(v_user, acc_ib, aapl, 11, usd, amt, 1.00, day + interval '15 hours', 'Bought the dip') THEN ib_usd := ib_usd - amt - 1.00; aapl_sh := aapl_sh + 11; END IF;
                IF _acctfee(v_user, acc_amex, gbp, 140.00, day + interval '6 hours', 'Amex annual fee') THEN amex_owed := amex_owed + 140; END IF;
            WHEN 428 THEN
                px := _rate_on(pr_btc, day, 80000);
                amt := round(0.025 * px, 2);
                need := ceil((amt + amt * 0.005 + 25 - cb_usd) / 25) * 25;
                IF need > 0 THEN
                    fxr := _rate_on(pr_usdgbp, day, 0.78);
                    IF _cashout(v_user, acc_savings, gbp, round(need * fxr, 2), day + interval '9 hours', 'Transfer to Coinbase') THEN bal_sav := bal_sav - round(need * fxr, 2); END IF;
                    IF _cashin(v_user, acc_coin, usd, need, day + interval '11 hours') THEN cb_usd := cb_usd + need; END IF;
                END IF;
                IF _buy(v_user, acc_coin, btc, 0.025, usd, amt, round(amt * 0.005, 2), day + interval '12 hours', 'Averaging down') THEN cb_usd := cb_usd - amt - round(amt * 0.005, 2); END IF;
            WHEN 429 THEN
                IF _cashxfer(v_user, acc_savings, acc_current, gbp, 11500, cat_cbt, day + interval '9 hours') THEN
                    bal_sav := bal_sav - 11500; bal_cur := bal_cur + 11500;
                END IF;
            WHEN 430 THEN
                grp := uuidv7();
                INSERT INTO transaction_group (id, category_id, description, date_added) VALUES (grp, cat_vehicle, 'Bought the Golf', day);
                t := _tx(v_user, 1, day + interval '11 hours', grp);
                PERFORM _entry(t, gbp, acc_current, -9800.00, cat_vehicle); PERFORM _desc(t, 'Used VW Golf - private sale via AutoTrader');
                bal_cur := bal_cur - 9800;
                t := _tx(v_user, 1, day + interval '12 hours', grp);
                PERFORM _entry(t, gbp, acc_current, -195.00, cat_vehicle); PERFORM _desc(t, 'DVLA vehicle tax');
                bal_cur := bal_cur - 195;
                t := _tx(v_user, 1, day + interval '13 hours', grp);
                PERFORM _entry(t, gbp, acc_current, -614.00, cat_insurance); PERFORM _desc(t, 'Admiral car insurance - annual');
                bal_cur := bal_cur - 614;
            WHEN 452 THEN
                IF _balxfer(v_user, acc_coin, acc_ledger, btc, 0.045, day + interval '19 hours', 'Moved to cold storage - not your keys') THEN
                    PERFORM _acctfee(v_user, acc_coin, usd, 10.00, day + interval '19 hours 5 minutes', 'Withdrawal fee');
                    cb_usd := cb_usd - 10;
                END IF;
            WHEN 458 THEN
                IF _spend(v_user, acc_current, gbp, 42.00, cat_gifts, day + interval '12 hours', 'Flowers for Mum''s birthday') THEN bal_cur := bal_cur - 42; END IF;
            WHEN 462 THEN
                IF _spend(v_user, acc_amex, gbp, 86.00, cat_alcohol, day + interval '20 hours', 'Leaving drinks - The Crown & Anchor') THEN amex_owed := amex_owed + 86; END IF;
            WHEN 483 THEN
                IF _income(v_user, acc_current, gbp, 1200.00, cat_bonus, day + interval '6 hours', 'Signing bonus - Novabank') THEN bal_cur := bal_cur + 1200; END IF;
            WHEN 485 THEN
                PERFORM _assetdiv(v_user, acc_coin, eth, 0.0038, day + interval '4 hours', 'ETH staking reward');
            WHEN 488 THEN
                IF _cashout(v_user, acc_current, gbp, 300.00, day + interval '13 hours', 'Loan to Tom for Glastonbury ticket') THEN bal_cur := bal_cur - 300; END IF;
            WHEN 489 THEN
                px := _rate_on(pr_aapl, day, 226);
                amt := round(12 * px, 2);
                need := ceil((amt + 1 + 150 - ib_usd) / 50) * 50;
                IF need > 0 THEN
                    fxr := _rate_on(pr_usdgbp, day, 0.78);
                    IF _cashout(v_user, acc_savings, gbp, round(need * fxr, 2), day + interval '9 hours', 'Wise transfer to Interactive Brokers') THEN bal_sav := bal_sav - round(need * fxr, 2); END IF;
                    IF _cashin(v_user, acc_ib, usd, need, day + interval '11 hours') THEN ib_usd := ib_usd + need; END IF;
                END IF;
                IF _buy(v_user, acc_ib, aapl, 12, usd, amt, 1.00, day + interval '15 hours') THEN ib_usd := ib_usd - amt - 1.00; aapl_sh := aapl_sh + 12; END IF;
            WHEN 491 THEN
                PERFORM _xferout(v_user, acc_coin, btc, 0.004, day + interval '18 hours', 'Paid Dan back in BTC for festival tickets');
            WHEN 495 THEN
                IF _income(v_user, acc_current, gbp, 460.00, cat_freelance, day + interval '18 hours', 'Invoice #0043 - freelance API integration') THEN bal_cur := bal_cur + 460; END IF;
            WHEN 514 THEN
                IF _trade(v_user, acc_coin, btc, 0.006, eth, 0.19, usd, 4.20, day + interval '16 hours', 'Rebalancing a little BTC into ETH') THEN cb_usd := cb_usd - 4.20; END IF;
            WHEN 517 THEN
                IF _spend(v_user, acc_current, gbp, 212.00, cat_vehmaint, day + interval '11 hours', 'Winter tyres fitted') THEN bal_cur := bal_cur - 212; END IF;
            WHEN 521 THEN
                IF _spend(v_user, acc_current, gbp, 189.00, cat_optical, day + interval '15 hours', 'Specsavers - new glasses after sitting on the old ones') THEN bal_cur := bal_cur - 189; END IF;
            WHEN 545 THEN
                IF _spend(v_user, acc_current, gbp, 95.00, cat_education, day + interval '10 hours', 'Sourdough baking class at Bread Ahead') THEN bal_cur := bal_cur - 95; END IF;
            WHEN 549 THEN
                IF _spend(v_user, acc_amex, gbp, 118.00, cat_restaurants, day + interval '20 hours', 'Anniversary dinner with Sam - Clos Maggiore') THEN amex_owed := amex_owed + 118; END IF;
            WHEN 552 THEN
                PERFORM _assetdiv(v_user, acc_coin, eth, 0.0047, day + interval '4 hours', 'ETH staking reward');
            WHEN 576 THEN
                px := _rate_on(pr_btc, day, 102000);
                amt := round(0.038 * px, 2);
                need := ceil((amt + amt * 0.005 + 25 - cb_usd) / 25) * 25;
                IF need > 0 THEN
                    fxr := _rate_on(pr_usdgbp, day, 0.78);
                    IF _cashout(v_user, acc_savings, gbp, round(need * fxr, 2), day + interval '9 hours', 'Transfer to Coinbase') THEN bal_sav := bal_sav - round(need * fxr, 2); END IF;
                    IF _cashin(v_user, acc_coin, usd, need, day + interval '11 hours') THEN cb_usd := cb_usd + need; END IF;
                END IF;
                IF _buy(v_user, acc_coin, btc, 0.038, usd, amt, round(amt * 0.005, 2), day + interval '13 hours') THEN cb_usd := cb_usd - amt - round(amt * 0.005, 2); END IF;
            WHEN 578 THEN
                IF _cashin(v_user, acc_current, gbp, 300.00, day + interval '12 hours', 'Tom paid me back') THEN bal_cur := bal_cur + 300; END IF;
            WHEN 582 THEN
                px := _rate_on(pr_aapl, day, 228);
                amt := round(18 * px, 2);
                IF _sell(v_user, acc_ib, aapl, 18, usd, amt, 1.20, day + interval '15 hours', 'Trimming the position - taking some gains') THEN
                    ib_usd := ib_usd + amt - 1.20; aapl_sh := aapl_sh - 18;
                END IF;
            WHEN 585 THEN
                IF _spend(v_user, acc_current, gbp, 89.00, cat_tech, day + interval '13 hours', 'Cracked phone screen - repair at iSmash') THEN bal_cur := bal_cur - 89; END IF;
            WHEN 605 THEN
                IF _income(v_user, acc_current, gbp, 380.00, cat_freelance, day + interval '18 hours', 'Invoice #0044 - freelance consulting call') THEN bal_cur := bal_cur + 380; END IF;
            WHEN 610 THEN
                grp := uuidv7();
                INSERT INTO transaction_group (id, category_id, description, date_added) VALUES (grp, cat_flights, 'Paris weekend', day);
                t := _tx(v_user, 1, day + interval '7 hours', grp);
                PERFORM _entry(t, gbp, acc_current, -158.00, cat_flights); PERFORM _desc(t, 'Eurostar to Paris');
                bal_cur := bal_cur - 158;
                t := _tx(v_user, 1, day + interval '15 hours', grp);
                PERFORM _entry(t, gbp, acc_amex, -182.00, cat_accom); PERFORM _desc(t, 'Hotel Marais, 2 nights');
                amex_owed := amex_owed + 182;
                IF _cashxfer(v_user, acc_current, acc_cash, gbp, 155, cat_cbt, day + interval '8 hours') THEN bal_cur := bal_cur - 155; bal_cashgbp := bal_cashgbp + 155; END IF;
                IF _trade(v_user, acc_cash, gbp, 150, eur, 172, gbp, 2.00, day + interval '9 hours', 'Travel money - GBP to EUR') THEN bal_cashgbp := bal_cashgbp - 152.00; END IF;
            WHEN 611 THEN
                PERFORM _spend(v_user, acc_cash, eur, 64.00, cat_restaurants, day + interval '20 hours', 'Le Petit Bistro, Marais');
                PERFORM _spend(v_user, acc_cash, eur, 23.60, cat_pubtrans, day + interval '10 hours', 'RATP metro carnet');
                PERFORM _spend(v_user, acc_cash, eur, 9.80, cat_cafes, day + interval '9 hours', 'Boulangerie Moderne');
            WHEN 612 THEN
                PERFORM _spend(v_user, acc_cash, eur, 16.00, cat_entertain, day + interval '11 hours', 'Musee d''Orsay tickets');
                PERFORM _spend(v_user, acc_cash, eur, 12.30, cat_cafes, day + interval '15 hours', 'Cafe de Flore');
                PERFORM _spend(v_user, acc_cash, eur, 46.30, cat_restaurants, day + interval '20 hours', 'Brasserie Lipp');
            WHEN 615 THEN
                IF _spend(v_user, acc_amex, gbp, 130.00, cat_entertain, day + interval '19 hours', 'Theatre tickets - Book of Mormon') THEN amex_owed := amex_owed + 130; END IF;
            WHEN 620 THEN
                IF _income(v_user, acc_current, gbp, 3900.00, cat_bonus, day + interval '6 hours', 'Annual bonus - Novabank') THEN bal_cur := bal_cur + 3900; END IF;
            WHEN 622 THEN
                px := _rate_on(pr_vwrp, day, 128);
                IF _cashxfer(v_user, acc_current, acc_isa, gbp, 1000, cat_cbt, day + interval '9 hours') THEN bal_cur := bal_cur - 1000; END IF;
                PERFORM _buy(v_user, acc_isa, vwrp, round(1000 / px, 4), gbp, 1000, 0, day + interval '10 hours', 'Putting the bonus to work');
            WHEN 623 THEN
                fxr := _rate_on(pr_usdgbp, day, 0.78);
                IF _cashout(v_user, acc_ib, usd, 2500, day + interval '9 hours', 'Brought some profits home') THEN ib_usd := ib_usd - 2500; END IF;
                IF _cashin(v_user, acc_current, gbp, round(2500 * fxr, 2), day + interval '11 hours', 'Transfer from Interactive Brokers') THEN bal_cur := bal_cur + round(2500 * fxr, 2); END IF;
            WHEN 635 THEN
                PERFORM _assetdiv(v_user, acc_coin, eth, 0.0052, day + interval '4 hours', 'ETH staking reward');
            WHEN 641 THEN
                px := _rate_on(pr_aapl, day, 232);
                amt := round(11 * px, 2);
                need := ceil((amt + 1 + 150 - ib_usd) / 50) * 50;
                IF need > 0 THEN
                    fxr := _rate_on(pr_usdgbp, day, 0.78);
                    IF _cashout(v_user, acc_savings, gbp, round(need * fxr, 2), day + interval '9 hours', 'Wise transfer to Interactive Brokers') THEN bal_sav := bal_sav - round(need * fxr, 2); END IF;
                    IF _cashin(v_user, acc_ib, usd, need, day + interval '11 hours') THEN ib_usd := ib_usd + need; END IF;
                END IF;
                IF _buy(v_user, acc_ib, aapl, 11, usd, amt, 1.00, day + interval '15 hours') THEN ib_usd := ib_usd - amt - 1.00; aapl_sh := aapl_sh + 11; END IF;
            WHEN 663 THEN
                IF _balxfer(v_user, acc_coin, acc_ledger, btc, 0.02, day + interval '18 hours', 'Topping up cold storage') THEN
                    PERFORM _acctfee(v_user, acc_coin, usd, 10.00, day + interval '18 hours 5 minutes', 'Withdrawal fee');
                    cb_usd := cb_usd - 10;
                END IF;
            WHEN 665 THEN
                grp := uuidv7();
                INSERT INTO transaction_group (id, category_id, description, date_added) VALUES (grp, cat_groceries, 'Tesco big shop', day);
                t := _tx(v_user, 1, day + interval '17 hours', grp);
                PERFORM _entry(t, gbp, acc_current, -61.20, cat_groceries); PERFORM _desc(t, 'Groceries');
                t := _tx(v_user, 1, day + interval '17 hours', grp);
                PERFORM _entry(t, gbp, acc_current, -18.40, cat_household); PERFORM _desc(t, 'Household bits');
                t := _tx(v_user, 1, day + interval '17 hours', grp);
                PERFORM _entry(t, gbp, acc_current, -14.00, cat_alcohol); PERFORM _desc(t, 'Wine for the weekend');
                t := _tx(v_user, 1, day + interval '17 hours', grp);
                PERFORM _entry(t, gbp, acc_current, -6.50, cat_misc); PERFORM _desc(t, 'Flowers for the flat');
                bal_cur := bal_cur - 100.10;
            WHEN 668 THEN
                IF _income(v_user, acc_current, gbp, 310.00, cat_freelance, day + interval '18 hours', 'Invoice #0045 - freelance code review') THEN bal_cur := bal_cur + 310; END IF;
            WHEN 695 THEN
                px := _rate_on(pr_eth, day, 3300);
                amt := round(0.15 * px, 2);
                IF _sell(v_user, acc_coin, eth, 0.15, usd, amt, round(amt * 0.006, 2), day + interval '14 hours', 'Taking a little profit') THEN
                    cb_usd := cb_usd + amt - round(amt * 0.006, 2);
                END IF;
            WHEN 698 THEN
                IF _spend(v_user, acc_current, gbp, 254.00, cat_vehmaint, day + interval '9 hours', 'MOT + full service - passed with advisories') THEN bal_cur := bal_cur - 254; END IF;
            WHEN 701 THEN
                IF _spend(v_user, acc_amex, gbp, 85.00, cat_gifts, day + interval '14 hours', 'Birthday gift for Sam - John Lewis') THEN amex_owed := amex_owed + 85; END IF;
            WHEN 702 THEN
                IF _spend(v_user, acc_amex, gbp, 112.00, cat_restaurants, day + interval '20 hours', 'Birthday dinner for Sam - Dishoom') THEN amex_owed := amex_owed + 112; END IF;
            ELSE NULL;
        END CASE;

        -- Trailing week of scripted texture so the most recent feed screen shows every icon shape.
        IF d = 5 THEN
            IF _income(v_user, acc_current, gbp, 180.00, cat_sideinc, day + interval '17 hours', 'Sold old iPad on eBay') THEN bal_cur := bal_cur + 180; END IF;
        END IF;
        IF d = 4 THEN
            PERFORM _assetdiv(v_user, acc_coin, eth, 0.0035, day + interval '4 hours', 'ETH staking reward');
        END IF;
        IF d = 3 THEN
            IF _cashxfer(v_user, acc_current, acc_cash, gbp, 80, cat_cbt, day + interval '12 hours') THEN bal_cur := bal_cur - 80; bal_cashgbp := bal_cashgbp + 80; END IF;
        END IF;
        IF d = 2 THEN
            grp := uuidv7();
            INSERT INTO transaction_group (id, category_id, description, date_added) VALUES (grp, cat_tech, 'Home office refresh', day);
            t := _tx(v_user, 1, day + interval '11 hours', grp);
            PERFORM _entry(t, gbp, acc_amex, -239.99, cat_tech); PERFORM _desc(t, 'FlexiSpot standing desk');
            t := _tx(v_user, 1, day + interval '11 hours 5 minutes', grp);
            PERFORM _entry(t, gbp, acc_amex, -189.00, cat_tech); PERFORM _desc(t, 'Dell 27in monitor');
            t := _tx(v_user, 1, day + interval '15 hours', grp);
            PERFORM _entry(t, gbp, acc_amex, -380.00, cat_household); PERFORM _desc(t, 'Second-hand Herman Miller chair - eBay');
            amex_owed := amex_owed + 808.99;
        END IF;

        -- AAPL dividends, quarterly, computed from the live share count at that date.
        IF m IN (3, 6, 9, 12, 15, 18, 21) AND sd = m * 30 + 20 AND aapl_sh > 0 THEN
            div_i := div_i + 1;
            amt := round(aapl_sh * (0.24 + 0.01 * div_i), 2);
            IF _cashdiv(v_user, acc_ib, usd, amt, aapl, round(amt * 0.15, 2), day + interval '14 hours') THEN
                ib_usd := ib_usd + amt - round(amt * 0.15, 2);
            END IF;
        END IF;
        IF d = 10 AND aapl_sh > 0 THEN
            div_i := div_i + 1;
            amt := round(aapl_sh * (0.24 + 0.01 * div_i), 2);
            IF _cashdiv(v_user, acc_ib, usd, amt, aapl, round(amt * 0.15, 2), day + interval '14 hours') THEN
                ib_usd := ib_usd + amt - round(amt * 0.15, 2);
            END IF;
        END IF;

        -- ── Discretionary spending ──────────────────────────────────────────
        -- Draws always happen (even when the insert would land in the future) so the RNG sequence,
        -- and therefore the historical dataset, is independent of the load time-of-day.
        n := CASE WHEN dow IN (5, 6) THEN 3 ELSE 2 END + _rndi(0, 2);
        IF random() < 0.08 THEN n := 1; END IF;
        IF d <= 7 THEN n := GREATEST(n, 3); END IF;

        FOR i IN 1..n LOOP
            SELECT * INTO r FROM _pick(dow, m, mo,
                CASE
                    WHEN dow = 7 THEN ARRAY['takeaway','grocery','coffee','entertainment','shopping','misc','market','fuel']
                    WHEN dow IN (5, 6) THEN ARRAY['coffee','grocery','takeaway','transport','pharmacy','shopping','misc','restaurant','pub','entertainment','taxi','fuel','personal']
                    ELSE ARRAY['coffee','grocery','takeaway','transport','pharmacy','shopping','misc','fuel','personal']
                END, used);
            IF r.id IS NULL THEN CONTINUE; END IF;
            used := used || r.id;
            amt := _rnd2(r.lo, r.hi);
            ts := day + make_interval(hours => _rndi(r.hlo, r.hhi), mins => _rndi(0, 59));
            IF r.acct = 'cash' THEN
                IF bal_cashgbp >= amt THEN
                    IF _spend(v_user, acc_cash, gbp, amt, r.cat, ts, r.merchant) THEN bal_cashgbp := bal_cashgbp - amt; END IF;
                END IF;
            ELSIF r.acct = 'amex' THEN
                IF _spend(v_user, acc_amex, gbp, amt, r.cat, ts, r.merchant) THEN amex_owed := amex_owed + amt; END IF;
            ELSE
                IF bal_cur - amt < 350 THEN
                    IF r.kind IN ('restaurant', 'pub', 'shopping', 'entertainment') THEN
                        IF _spend(v_user, acc_amex, gbp, amt, r.cat, ts, r.merchant) THEN amex_owed := amex_owed + amt; END IF;
                    END IF;
                ELSE
                    IF _spend(v_user, acc_current, gbp, amt, r.cat, ts, r.merchant) THEN bal_cur := bal_cur - amt; END IF;
                END IF;
            END IF;
        END LOOP;

        -- December gift engine, keyed to the calendar so it fires in any loaded year.
        IF mo = 12 AND dom BETWEEN 2 AND 20 AND random() < 0.30 THEN
            amt := _rnd2(18, 95);
            i := _rndi(1, 4);
            ok := _spend(v_user, acc_amex, gbp, amt, cat_gifts, day + make_interval(hours => _rndi(11, 20)),
                CASE i WHEN 1 THEN 'John Lewis - Christmas presents'
                       WHEN 2 THEN 'Etsy - personalised gift'
                       WHEN 3 THEN 'Amazon - Christmas presents'
                       ELSE 'Not On The High Street - gift' END);
            IF ok THEN amex_owed := amex_owed + amt; END IF;
        END IF;
        IF mo = 12 AND dom = 8 THEN
            IF _spend(v_user, acc_current, gbp, 45.00, cat_gifts, day + interval '15 hours', 'Christmas tree from Columbia Road') THEN bal_cur := bal_cur - 45; END IF;
        END IF;
        IF mo = 12 AND dom = 12 THEN
            IF _spend(v_user, acc_current, gbp, 15.00, cat_gifts, day + interval '13 hours', 'Office Secret Santa') THEN bal_cur := bal_cur - 15; END IF;
        END IF;
        IF mo = 12 AND dom = 22 THEN
            amt := _rnd2(86, 94);
            IF _spend(v_user, acc_current, gbp, amt, cat_pubtrans, day + interval '10 hours', 'Trainline - home for Christmas') THEN bal_cur := bal_cur - amt; END IF;
        END IF;
    END LOOP;

    -- ── Post-seed audit: fail loudly rather than ship implausible data ─────
    IF (SELECT count(DISTINCT type_id) FROM transaction WHERE user_id = v_user) < 13 THEN
        RAISE EXCEPTION 'Seed audit failed: not all 13 transaction types present';
    END IF;
    IF (SELECT count(DISTINCT description) FROM transaction_descriptions td JOIN transaction t ON t.id = td.transaction_id WHERE t.user_id = v_user) < 45 THEN
        RAISE EXCEPTION 'Seed audit failed: fewer than 45 distinct descriptions';
    END IF;
    SELECT EXISTS (
        SELECT 1 FROM (
            SELECT e.account_id, e.asset_id,
                   sum(e.quantity) OVER (PARTITION BY e.account_id, e.asset_id ORDER BY t.date_transacted, t.id) AS run
            FROM entry e JOIN transaction t ON t.id = e.transaction_id
            WHERE t.user_id = v_user
              AND e.account_id IN (acc_current, acc_savings, acc_joint, acc_cash, acc_isa, acc_ib, acc_coin, acc_ledger)
        ) s WHERE s.run < -0.01
    ) INTO bad;
    IF bad THEN
        RAISE EXCEPTION 'Seed audit failed: an asset account balance went negative';
    END IF;
    SELECT EXISTS (
        SELECT 1 FROM (
            SELECT sum(e.quantity) OVER (ORDER BY t.date_transacted, t.id) AS run
            FROM entry e JOIN transaction t ON t.id = e.transaction_id
            WHERE t.user_id = v_user AND e.account_id = acc_amex
        ) s WHERE s.run < -2500 OR s.run > 0.01
    ) INTO bad;
    IF bad THEN
        RAISE EXCEPTION 'Seed audit failed: Amex balance outside plausible range';
    END IF;

    RAISE NOTICE 'Showcase data seeded for default user (% transactions).',
        (SELECT count(*) FROM transaction WHERE user_id = v_user);
END $do$;

DROP FUNCTION _spend(uuid, uuid, int, numeric, int, timestamptz, text);
DROP FUNCTION _income(uuid, uuid, int, numeric, int, timestamptz, text);
DROP FUNCTION _cashin(uuid, uuid, int, numeric, timestamptz, text);
DROP FUNCTION _cashout(uuid, uuid, int, numeric, timestamptz, text);
DROP FUNCTION _cashxfer(uuid, uuid, uuid, int, numeric, int, timestamptz);
DROP FUNCTION _buy(uuid, uuid, int, numeric, int, numeric, numeric, timestamptz, text);
DROP FUNCTION _sell(uuid, uuid, int, numeric, int, numeric, numeric, timestamptz, text);
DROP FUNCTION _trade(uuid, uuid, int, numeric, int, numeric, int, numeric, timestamptz, text);
DROP FUNCTION _xferin(uuid, uuid, int, numeric, timestamptz, text);
DROP FUNCTION _xferout(uuid, uuid, int, numeric, timestamptz, text);
DROP FUNCTION _balxfer(uuid, uuid, uuid, int, numeric, timestamptz, text);
DROP FUNCTION _cashdiv(uuid, uuid, int, numeric, int, numeric, timestamptz);
DROP FUNCTION _assetdiv(uuid, uuid, int, numeric, timestamptz, text);
DROP FUNCTION _acctfee(uuid, uuid, int, numeric, timestamptz, text);
DROP FUNCTION _seed_gbm(int, int, numeric, numeric, numeric, numeric, numeric);
DROP FUNCTION _seed_flat_rates(int, numeric[], int);
DROP FUNCTION _seed_asset(int, text, text, text, int, uuid);
DROP FUNCTION _seed_pair_id(int, int);
DROP FUNCTION _rate_on(int, timestamptz, numeric);
DROP FUNCTION _rnd(numeric, numeric);
DROP FUNCTION _rnd2(numeric, numeric);
DROP FUNCTION _rndi(int, int);
DROP FUNCTION _szn(text, int);
DROP FUNCTION _pick(int, int, int, text[], int[]);
DROP FUNCTION _tx(uuid, int, timestamptz, uuid);
DROP FUNCTION _entry(uuid, int, uuid, numeric, int);
DROP FUNCTION _desc(uuid, text);
DROP FUNCTION _cat(text, int);
