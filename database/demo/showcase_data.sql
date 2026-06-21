-- Demo / showcase dataset for the default user. Applied on demand via `make seed-demo`, not as an
-- automatic migration. Self-contained and idempotent: it ensures the default user exists, upserts
-- every instrument it needs by ticker, seeds rate history for custom assets only (listed assets are
-- priced by the market-data worker), and bails out early if the user already has accounts. All dates
-- are anchored to now() so the dataset is always current at the moment it is loaded.

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

-- Daily-ish points (every 4 days over 24 months) with a linear drift, an optional mid-history dip
-- (market correction, centred at p_dipf as a fraction of the timeline), and layered incommensurate
-- sine noise so the series jitters organically like real market data rather than a smooth line.
CREATE OR REPLACE FUNCTION _seed_rates(p_pair int, p_start numeric, p_end numeric, p_vol numeric, p_dip numeric DEFAULT 0, p_dipf numeric DEFAULT 0.55) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE n int := 182; i int; frac numeric; t numeric; r numeric; noise numeric;
BEGIN
    INSERT INTO asset_history (pair_id, rate, recorded_at)
    VALUES (p_pair, GREATEST(round(p_start, 6), 0.000001), date_trunc('day', now()) - make_interval(months => 24) - interval '2 months')
    ON CONFLICT (pair_id, recorded_at) DO NOTHING;
    FOR i IN 0..n LOOP
        frac := i::numeric / n;
        t := i;
        noise := p_vol * (0.6 * sin(t * 0.9) + 0.45 * sin(t * 2.3 + 1.1) + 0.3 * sin(t * 5.1 + 2.7)
                          + 0.55 * sin(t * 0.37 + 0.5) + 0.25 * sin(t * 11.3));
        r := round((p_start + (p_end - p_start) * frac
             - p_dip * exp(-((frac - p_dipf) * (frac - p_dipf)) / (2 * 0.13 * 0.13))
             + noise)::numeric, 6);
        INSERT INTO asset_history (pair_id, rate, recorded_at)
        VALUES (p_pair, GREATEST(r, 0.000001), date_trunc('day', now()) - make_interval(days => (n - i) * 4))
        ON CONFLICT (pair_id, recorded_at) DO NOTHING;
    END LOOP;
    INSERT INTO asset_history (pair_id, rate, recorded_at)
    VALUES (p_pair, GREATEST(round((p_end + p_vol * 0.4 * sin(n * 0.9))::numeric, 6), 0.000001), date_trunc('hour', now()))
    ON CONFLICT (pair_id, recorded_at) DO NOTHING;
END $fn$;

CREATE OR REPLACE FUNCTION _seed_flat_rates(p_pair int, p_pts numeric[]) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE i int; n int := array_length(p_pts, 1);
BEGIN
    INSERT INTO asset_history (pair_id, rate, recorded_at)
    VALUES (p_pair, p_pts[1], date_trunc('day', now()) - make_interval(months => (n - 1) * 3) - interval '2 months')
    ON CONFLICT (pair_id, recorded_at) DO NOTHING;
    FOR i IN 1..n LOOP
        INSERT INTO asset_history (pair_id, rate, recorded_at)
        VALUES (p_pair, p_pts[i], date_trunc('day', now()) - make_interval(months => (n - i) * 3))
        ON CONFLICT (pair_id, recorded_at) DO NOTHING;
    END LOOP;
    INSERT INTO asset_history (pair_id, rate, recorded_at)
    VALUES (p_pair, p_pts[n], date_trunc('hour', now()))
    ON CONFLICT (pair_id, recorded_at) DO NOTHING;
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

-- Composite inserters. Each no-ops if dated in the future, so the current month never spills past today.
CREATE OR REPLACE FUNCTION _spend(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_cat int, p_date timestamptz, p_desc text) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 1, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, -abs(p_amt), p_cat);
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
END $fn$;

CREATE OR REPLACE FUNCTION _income(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_cat int, p_date timestamptz, p_desc text) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 1, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, abs(p_amt), p_cat);
    IF p_desc IS NOT NULL THEN PERFORM _desc(t, p_desc); END IF;
END $fn$;

CREATE OR REPLACE FUNCTION _cashin(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 3, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, abs(p_amt), 5);
END $fn$;

CREATE OR REPLACE FUNCTION _cashout(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 2, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, -abs(p_amt), 9);
END $fn$;

CREATE OR REPLACE FUNCTION _cashxfer(p_user uuid, p_from uuid, p_to uuid, p_ccy int, p_amt numeric, p_cat int, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 13, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_from, -abs(p_amt), p_cat);
    PERFORM _entry(t, p_ccy, p_to, abs(p_amt), p_cat);
END $fn$;

CREATE OR REPLACE FUNCTION _buy(p_user uuid, p_acct uuid, p_asset int, p_units numeric, p_ccy int, p_cost numeric, p_fee numeric, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 9, p_date, NULL);
    PERFORM _entry(t, p_asset, p_acct, abs(p_units), 3);
    PERFORM _entry(t, p_ccy, p_acct, -abs(p_cost), 3);
    IF p_fee > 0 THEN PERFORM _entry(t, p_ccy, p_acct, -abs(p_fee), 2); END IF;
END $fn$;

CREATE OR REPLACE FUNCTION _sell(p_user uuid, p_acct uuid, p_asset int, p_units numeric, p_ccy int, p_proceeds numeric, p_fee numeric, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 8, p_date, NULL);
    PERFORM _entry(t, p_asset, p_acct, -abs(p_units), 4);
    PERFORM _entry(t, p_ccy, p_acct, abs(p_proceeds), 4);
    IF p_fee > 0 THEN PERFORM _entry(t, p_ccy, p_acct, -abs(p_fee), 2); END IF;
END $fn$;

CREATE OR REPLACE FUNCTION _trade(p_user uuid, p_acct uuid, p_out int, p_out_units numeric, p_in int, p_in_units numeric, p_ccy int, p_fee numeric, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 7, p_date, NULL);
    PERFORM _entry(t, p_out, p_acct, -abs(p_out_units), 12);
    PERFORM _entry(t, p_in, p_acct, abs(p_in_units), 12);
    IF p_fee > 0 THEN PERFORM _entry(t, p_ccy, p_acct, -abs(p_fee), 1); END IF;
END $fn$;

CREATE OR REPLACE FUNCTION _xferin(p_user uuid, p_acct uuid, p_asset int, p_units numeric, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 6, p_date, NULL);
    PERFORM _entry(t, p_asset, p_acct, abs(p_units), 11);
END $fn$;

CREATE OR REPLACE FUNCTION _xferout(p_user uuid, p_acct uuid, p_asset int, p_units numeric, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 5, p_date, NULL);
    PERFORM _entry(t, p_asset, p_acct, -abs(p_units), 10);
END $fn$;

CREATE OR REPLACE FUNCTION _balxfer(p_user uuid, p_from uuid, p_to uuid, p_asset int, p_units numeric, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 11, p_date, NULL);
    PERFORM _entry(t, p_asset, p_from, -abs(p_units), 13);
    PERFORM _entry(t, p_asset, p_to, abs(p_units), 13);
END $fn$;

CREATE OR REPLACE FUNCTION _cashdiv(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_source int, p_withhold numeric, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 4, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, abs(p_amt), 6);
    IF p_withhold > 0 THEN PERFORM _entry(t, p_ccy, p_acct, -abs(p_withhold), 8); END IF;
    INSERT INTO transaction_dividends (transaction_id, source_asset_id) VALUES (t, p_source);
END $fn$;

CREATE OR REPLACE FUNCTION _assetdiv(p_user uuid, p_acct uuid, p_asset int, p_units numeric, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 10, p_date, NULL);
    PERFORM _entry(t, p_asset, p_acct, abs(p_units), 7);
END $fn$;

CREATE OR REPLACE FUNCTION _acctfee(p_user uuid, p_acct uuid, p_ccy int, p_amt numeric, p_date timestamptz) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE t uuid;
BEGIN
    IF p_date > now() THEN RETURN; END IF;
    t := _tx(p_user, 12, p_date, NULL);
    PERFORM _entry(t, p_ccy, p_acct, -abs(p_amt), 14);
END $fn$;

DO $do$
DECLARE
    v_user uuid := '00000000-0000-0000-0000-000000000000';
    v_now  timestamptz := now();
    gbp int; usd int;
    vwrp int; aapl int; btc int; eth int; flat int; acme int;
    pr_flat int; pr_acme int;

    acc_current uuid := '11111111-1111-1111-1111-111111111101';
    acc_savings uuid := '11111111-1111-1111-1111-111111111102';
    acc_isa     uuid := '11111111-1111-1111-1111-111111111103';
    acc_ib      uuid := '11111111-1111-1111-1111-111111111104';
    acc_coin    uuid := '11111111-1111-1111-1111-111111111105';
    acc_ledger  uuid := '11111111-1111-1111-1111-111111111106';
    acc_amex    uuid := '11111111-1111-1111-1111-111111111107';
    acc_mort    uuid := '11111111-1111-1111-1111-111111111108';
    acc_home    uuid := '11111111-1111-1111-1111-111111111109';
    acc_cash    uuid := '11111111-1111-1111-1111-111111111110';

    cat_salary int; cat_bonus int; cat_interest int;
    cat_photo int; cat_wood int; ctype_hobby int; cat_cbt int; cat_car int;

    m int; ms timestamptz; vwrp_px numeric; units numeric;
    grp uuid; t uuid;
BEGIN
    IF EXISTS (SELECT 1 FROM account WHERE user_id = v_user) THEN
        RAISE NOTICE 'Showcase data already present for default user, skipping.';
        RETURN;
    END IF;

    INSERT INTO users (id, username, default_asset) VALUES (v_user, 'User', NULL) ON CONFLICT (id) DO NOTHING;
    INSERT INTO user_role_assignments (user_id, role_id) VALUES (v_user, 2) ON CONFLICT DO NOTHING;

    SELECT id INTO gbp FROM assets WHERE ticker = 'GBP';
    SELECT id INTO usd FROM assets WHERE ticker = 'USD';

    UPDATE users SET default_asset = gbp, onboarding_version = 1 WHERE id = v_user;

    -- Assets (listed upserted as shared; flat + acme as custom user assets).
    vwrp := _seed_asset(5, 'Vanguard FTSE All-World UCITS ETF (Acc)', 'VWRP.LSE', 'IE00BK5BQT80', gbp, NULL);
    aapl := _seed_asset(2, 'Apple Inc.', 'AAPL.NASDAQ', 'US0378331005', usd, NULL);
    btc  := _seed_asset(7, 'Bitcoin', 'BTC', NULL, usd, NULL);
    eth  := _seed_asset(7, 'Ethereum', 'ETH', NULL, usd, NULL);
    flat := _seed_asset(8, 'Flat 4, Maple Court', 'FLAT.LON', NULL, gbp, v_user);
    acme := _seed_asset(2, 'Acme Robotics Ltd (private)', 'ACME', NULL, gbp, v_user);

    pr_flat := _seed_pair_id(flat, gbp);
    pr_acme := _seed_pair_id(acme, gbp);

    -- Rate history is seeded ONLY for custom assets, which have no market feed. Listed assets
    -- (VWRP, AAPL, BTC, ETH) and the FX crosses are priced from the market-data service by the
    -- worker's backfill/refresh jobs (run `make worker-run`); their pairs just need to exist and be
    -- held, which the transactions below ensure.

    -- Real estate: explicit non-monotonic appraisals (rise, peak, correction, recovery).
    PERFORM _seed_flat_rates(pr_flat, ARRAY[272000,282000,296000,301000,289000,281000,294000,306000,317000]);
    -- Private company stake: a few manual valuations over its holding period.
    PERFORM _seed_rates(pr_acme, 5.00, 8.20, 0, 0);

    -- Accounts (account_type ids: 1 Current, 2 Savings, 3 Investment, 4 Credit, 7 Mortgage,
    -- 9 Real Estate, 10 Crypto Wallet, 11 Cash; liquidity 1 = Liquid).
    INSERT INTO account (id, user_id, account_name, account_type, liquidity_type, ownership_share) VALUES
        (acc_current, v_user, 'Lloyds Current Account',  1, 1, 1.0),
        (acc_savings, v_user, 'Marcus Savings',          2, 1, 1.0),
        (acc_isa,     v_user, 'Trading 212 ISA',         3, 1, 1.0),
        (acc_ib,      v_user, 'Interactive Brokers',     3, 1, 1.0),
        (acc_coin,    v_user, 'Coinbase',               10, 1, 1.0),
        (acc_ledger,  v_user, 'Ledger Hardware Wallet', 10, 1, 1.0),
        (acc_amex,    v_user, 'Amex Credit Card',        4, 1, 1.0),
        (acc_mort,    v_user, 'Halifax Mortgage',        7, 1, 0.5),
        (acc_home,    v_user, 'Home',                    9, 1, 0.5),
        (acc_cash,    v_user, 'Cash Wallet',            11, 1, 1.0);

    -- Custom income categories (built-in Income type id 1 ships empty) and a custom type + categories.
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Salary', 'wallet', 1, v_user) RETURNING id INTO cat_salary;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Bonus', 'gift', 1, v_user) RETURNING id INTO cat_bonus;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Interest', 'piggy-bank', 1, v_user) RETURNING id INTO cat_interest;
    INSERT INTO transaction_category_type (category_type_name, user_id) VALUES ('Hobbies & Side Projects', v_user) RETURNING id INTO ctype_hobby;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Photography Gear', 'camera', ctype_hobby, v_user) RETURNING id INTO cat_photo;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Woodworking', 'hammer', ctype_hobby, v_user) RETURNING id INTO cat_wood;
    INSERT INTO transaction_categories (category, icon, category_type, user_id) VALUES ('Vehicle Purchase', 'car', 6, v_user) RETURNING id INTO cat_car;
    SELECT id INTO cat_cbt FROM transaction_categories WHERE category = 'Cash Balance Transfer' AND user_id IS NULL;

    -- Opening balances (~24 months ago).
    ms := date_trunc('month', v_now) - make_interval(months => 24) + interval '2 days';
    PERFORM _cashin(v_user, acc_current, gbp, 5200,   ms);
    PERFORM _cashin(v_user, acc_savings, gbp, 11000,  ms);
    PERFORM _cashin(v_user, acc_cash,    gbp, 350,    ms);
    PERFORM _cashin(v_user, acc_ib,      usd, 8000,   ms + interval '20 days');
    PERFORM _cashin(v_user, acc_coin,    usd, 5000,   ms + interval '30 days');
    PERFORM _cashout(v_user, acc_mort,   gbp, 184000, ms);
    PERFORM _xferin(v_user, acc_home, flat, 1, ms);

    -- Monthly recurring life, 24 months.
    FOR m IN 0..23 LOOP
        ms := date_trunc('month', v_now) - make_interval(months => 23 - m);
        vwrp_px := 96 + 1.28 * m;
        units := round((400 / vwrp_px)::numeric, 6);

        PERFORM _income(v_user, acc_current, gbp, round((3200 + 150 * sin(m * 1.7))::numeric, 2), cat_salary, ms + interval '24 days', 'Salary - Northgate Systems');
        PERFORM _spend(v_user, acc_current, gbp, 1150, 15, ms, 'Halifax mortgage payment');
        PERFORM _spend(v_user, acc_current, gbp, 168, 70, ms + interval '4 days', 'Council tax');
        PERFORM _spend(v_user, acc_current, gbp, round((68 + 8 * sin(m))::numeric, 2), 32, ms + interval '5 days', 'Octopus Energy electricity');
        IF m % 2 = 0 THEN
            PERFORM _spend(v_user, acc_current, gbp, round((52 + 10 * sin(m))::numeric, 2), 33, ms + interval '5 days', 'British Gas');
        END IF;
        PERFORM _spend(v_user, acc_current, gbp, 34, 34, ms + interval '7 days', 'Thames Water');
        PERFORM _spend(v_user, acc_current, gbp, 32, 35, ms + interval '9 days', 'BT broadband');
        PERFORM _spend(v_user, acc_current, gbp, 15, 36, ms + interval '11 days', 'EE mobile');
        PERFORM _spend(v_user, acc_current, gbp, 42, 42, ms + interval '1 days', 'PureGym membership');
        PERFORM _spend(v_user, acc_current, gbp, 10.99, 37, ms + interval '14 days', 'Netflix');
        PERFORM _spend(v_user, acc_current, gbp, 11.99, 37, ms + interval '15 days', 'Spotify');

        PERFORM _spend(v_user, acc_current, gbp, round((74 + 12 * sin(m * 1.3))::numeric, 2), 25, ms + interval '2 days', 'Tesco');
        PERFORM _spend(v_user, acc_current, gbp, round((61 + 14 * sin(m * 0.7))::numeric, 2), 25, ms + interval '12 days', 'Sainsburys');
        PERFORM _spend(v_user, acc_current, gbp, round((55 + 10 * sin(m * 1.9))::numeric, 2), 25, ms + interval '21 days', 'Lidl');
        PERFORM _spend(v_user, acc_current, gbp, 3.20, 27, ms + interval '3 days', 'Costa Coffee');
        PERFORM _spend(v_user, acc_current, gbp, 2.95, 27, ms + interval '10 days', 'Pret a Manger');
        PERFORM _spend(v_user, acc_current, gbp, 3.80, 27, ms + interval '18 days', 'Black Sheep Coffee');
        PERFORM _spend(v_user, acc_current, gbp, 18, 28, ms + interval '17 days', 'Deliveroo');
        PERFORM _spend(v_user, acc_current, gbp, round((58 + 12 * sin(m))::numeric, 2), 20, ms + interval '6 days', 'Shell petrol');
        PERFORM _spend(v_user, acc_current, gbp, round((54 + 9 * sin(m * 1.1))::numeric, 2), 20, ms + interval '20 days', 'BP petrol');
        PERFORM _spend(v_user, acc_current, gbp, 40, 21, ms + interval '2 days', 'TfL travel');

        -- Restaurant + a clothing buy run on the Amex; paid off most of it each month.
        PERFORM _spend(v_user, acc_amex, gbp, round((46 + 18 * sin(m * 0.5))::numeric, 2), 26, ms + interval '13 days', 'Dishoom');
        IF m % 3 = 0 THEN
            PERFORM _spend(v_user, acc_amex, gbp, 72, 52, ms + interval '16 days', 'Uniqlo');
        END IF;
        IF m % 6 = 2 THEN
            PERFORM _spend(v_user, acc_amex, gbp, 240, 53, ms + interval '8 days', 'Currys electronics');
        END IF;
        IF m % 2 = 1 THEN
            PERFORM _spend(v_user, acc_current, gbp, 12.40, 40, ms + interval '19 days', 'Boots pharmacy');
        END IF;
        PERFORM _cashxfer(v_user, acc_current, acc_amex, gbp, 95, cat_cbt, ms + interval '26 days');

        -- Save and invest from the current account.
        PERFORM _cashxfer(v_user, acc_current, acc_savings, gbp, 250, cat_cbt, ms + interval '25 days');
        PERFORM _cashxfer(v_user, acc_current, acc_isa, gbp, 400, cat_cbt, ms + interval '25 days');
        PERFORM _buy(v_user, acc_isa, vwrp, units, gbp, 400, 0, ms + interval '26 days');

        -- Quarterly savings interest and mortgage principal overpayment.
        IF m % 3 = 0 THEN
            PERFORM _income(v_user, acc_savings, gbp, round((22 + 4 * sin(m))::numeric, 2), cat_interest, ms + interval '27 days', 'Savings interest');
            PERFORM _cashin(v_user, acc_mort, gbp, 1500, ms + interval '27 days');
        END IF;
    END LOOP;

    -- Annual bonus.
    PERFORM _income(v_user, acc_current, gbp, 4200, cat_bonus, date_trunc('month', v_now) - make_interval(months => 18) + interval '24 days', 'Annual bonus');
    PERFORM _income(v_user, acc_current, gbp, 4600, cat_bonus, date_trunc('month', v_now) - make_interval(months => 6) + interval '24 days', 'Annual bonus');

    -- Hobby spends using custom categories.
    PERFORM _spend(v_user, acc_amex, gbp, 189, cat_photo, date_trunc('month', v_now) - make_interval(months => 9) + interval '6 days', 'WEX Photographic - lens');
    PERFORM _spend(v_user, acc_current, gbp, 64, cat_wood, date_trunc('month', v_now) - make_interval(months => 4) + interval '14 days', 'Axminster Tools');

    -- A used-car purchase ~12 months ago: a big one-off cash outlay (funded partly from savings) that
    -- dents net worth and takes a while to recover from.
    PERFORM _cashxfer(v_user, acc_savings, acc_current, gbp, 10000, cat_cbt, date_trunc('month', v_now) - make_interval(months => 12) + interval '9 days');
    PERFORM _spend(v_user, acc_current, gbp, 12500, cat_car, date_trunc('month', v_now) - make_interval(months => 12) + interval '10 days', 'Used car - VW Golf');

    -- AAPL: FIFO purchase lots, a partial sale, quarterly cash dividends.
    PERFORM _buy(v_user, acc_ib, aapl, 15, usd, 2670, 1, date_trunc('month', v_now) - make_interval(months => 20) + interval '8 days');
    PERFORM _buy(v_user, acc_ib, aapl, 10, usd, 1920, 1, date_trunc('month', v_now) - make_interval(months => 14) + interval '8 days');
    PERFORM _buy(v_user, acc_ib, aapl, 8,  usd, 1712, 1, date_trunc('month', v_now) - make_interval(months => 8) + interval '8 days');
    PERFORM _buy(v_user, acc_ib, aapl, 5,  usd, 1145, 1, date_trunc('month', v_now) - make_interval(months => 3) + interval '8 days');
    PERFORM _sell(v_user, acc_ib, aapl, 12, usd, 2664, 2, date_trunc('month', v_now) - make_interval(months => 6) + interval '10 days');
    FOR m IN 0..6 LOOP
        PERFORM _cashdiv(v_user, acc_ib, usd, round((5 + 0.4 * m)::numeric, 2), aapl, 0.8, date_trunc('month', v_now) - make_interval(months => 19 - m * 3) + interval '15 days');
    END LOOP;
    -- Quarterly broker account fee.
    FOR m IN 0..6 LOOP
        PERFORM _acctfee(v_user, acc_ib, usd, 3, date_trunc('month', v_now) - make_interval(months => 18 - m * 3) + interval '2 days');
    END LOOP;

    -- BTC purchases, an ETH gift in, a BTC->ETH trade, an ETH staking dividend, a BTC send out,
    -- and a BTC balance transfer to the hardware wallet.
    PERFORM _buy(v_user, acc_coin, btc, 0.05, usd, 2200, 10, date_trunc('month', v_now) - make_interval(months => 22) + interval '4 days');
    PERFORM _buy(v_user, acc_coin, btc, 0.03, usd, 1830, 8,  date_trunc('month', v_now) - make_interval(months => 12) + interval '4 days');
    PERFORM _xferin(v_user, acc_coin, eth, 0.5, date_trunc('month', v_now) - make_interval(months => 16) + interval '9 days');
    PERFORM _trade(v_user, acc_coin, btc, 0.01, eth, 0.2, usd, 5, date_trunc('month', v_now) - make_interval(months => 10) + interval '11 days');
    PERFORM _assetdiv(v_user, acc_coin, eth, 0.05, date_trunc('month', v_now) - make_interval(months => 5) + interval '5 days');
    PERFORM _xferout(v_user, acc_coin, btc, 0.005, date_trunc('month', v_now) - make_interval(months => 4) + interval '7 days');
    PERFORM _balxfer(v_user, acc_coin, acc_ledger, btc, 0.02, date_trunc('month', v_now) - make_interval(months => 7) + interval '12 days');

    -- Private company stake brought in.
    PERFORM _xferin(v_user, acc_isa, acme, 500, date_trunc('month', v_now) - make_interval(months => 18) + interval '3 days');

    -- A supermarket receipt split across categories.
    grp := uuidv7();
    INSERT INTO transaction_group (id, category_id, description, date_added)
    VALUES (grp, 25, 'Tesco weekly shop', date_trunc('month', v_now) - make_interval(months => 1) + interval '15 days');
    t := _tx(v_user, 1, date_trunc('month', v_now) - make_interval(months => 1) + interval '15 days', grp);
    PERFORM _entry(t, gbp, acc_current, -58.40, 25); PERFORM _desc(t, 'Groceries');
    t := _tx(v_user, 1, date_trunc('month', v_now) - make_interval(months => 1) + interval '15 days', grp);
    PERFORM _entry(t, gbp, acc_current, -17.90, 54); PERFORM _desc(t, 'Household items');
    t := _tx(v_user, 1, date_trunc('month', v_now) - make_interval(months => 1) + interval '15 days', grp);
    PERFORM _entry(t, gbp, acc_current, -13.50, 30); PERFORM _desc(t, 'Wine');

    -- A weekend trip booked as several payments.
    grp := uuidv7();
    INSERT INTO transaction_group (id, category_id, description, date_added)
    VALUES (grp, 61, 'Lisbon weekend', date_trunc('month', v_now) - make_interval(months => 5) + interval '2 days');
    t := _tx(v_user, 1, date_trunc('month', v_now) - make_interval(months => 5) + interval '2 days', grp);
    PERFORM _entry(t, gbp, acc_amex, -138.00, 61); PERFORM _desc(t, 'TAP Air flights');
    t := _tx(v_user, 1, date_trunc('month', v_now) - make_interval(months => 5) + interval '2 days', grp);
    PERFORM _entry(t, gbp, acc_amex, -224.00, 62); PERFORM _desc(t, 'Hotel Alfama');
    t := _tx(v_user, 1, date_trunc('month', v_now) - make_interval(months => 5) + interval '3 days', grp);
    PERFORM _entry(t, gbp, acc_amex, -76.00, 26); PERFORM _desc(t, 'Dinner at Time Out Market');

    -- Denser, very recent activity (last ~week, several per day, anchored to now()) so the most recent
    -- transactions feed looks full. Older history stays one-per-day.
    PERFORM _spend(v_user, acc_current, gbp, 3.40,  27, v_now - interval '2 hours', 'Caffe Nero');
    PERFORM _spend(v_user, acc_current, gbp, 9.20,  28, v_now - interval '30 minutes', 'Pret a Manger');
    PERFORM _spend(v_user, acc_current, gbp, 13.60, 24, date_trunc('day', v_now) - interval '1 days' + interval '8 hours', 'Uber');
    PERFORM _spend(v_user, acc_amex,    gbp, 28.99, 55, date_trunc('day', v_now) - interval '1 days' + interval '19 hours', 'Amazon');
    PERFORM _spend(v_user, acc_current, gbp, 4.20,  28, date_trunc('day', v_now) - interval '3 days' + interval '8 hours', 'Greggs');
    PERFORM _spend(v_user, acc_current, gbp, 54.80, 20, date_trunc('day', v_now) - interval '3 days' + interval '18 hours', 'Shell petrol');
    PERFORM _spend(v_user, acc_current, gbp, 12.40, 25, date_trunc('day', v_now) - interval '4 days' + interval '12 hours', 'Tesco Express');
    PERFORM _spend(v_user, acc_current, gbp, 3.20,  27, date_trunc('day', v_now) - interval '4 days' + interval '9 hours', 'Costa Coffee');
    PERFORM _spend(v_user, acc_current, gbp, 8.60,  40, date_trunc('day', v_now) - interval '5 days' + interval '13 hours', 'Boots pharmacy');
    PERFORM _spend(v_user, acc_amex,    gbp, 13.00, 46, date_trunc('day', v_now) - interval '5 days' + interval '20 hours', 'Vue Cinema');
    PERFORM _spend(v_user, acc_current, gbp, 22.40, 28, date_trunc('day', v_now) - interval '6 days' + interval '19 hours', 'Deliveroo');
    PERFORM _spend(v_user, acc_current, gbp, 3.50,  27, date_trunc('day', v_now) - interval '6 days' + interval '8 hours', 'Caffe Nero');

    -- A Lidl shop split into line items (transaction group), a couple of days ago.
    grp := uuidv7();
    INSERT INTO transaction_group (id, category_id, description, date_added)
    VALUES (grp, 25, 'Lidl shop', date_trunc('day', v_now) - interval '2 days' + interval '17 hours');
    t := _tx(v_user, 1, date_trunc('day', v_now) - interval '2 days' + interval '17 hours', grp);
    PERFORM _entry(t, gbp, acc_current, -41.30, 25); PERFORM _desc(t, 'Groceries');
    t := _tx(v_user, 1, date_trunc('day', v_now) - interval '2 days' + interval '17 hours', grp);
    PERFORM _entry(t, gbp, acc_current, -7.20, 54); PERFORM _desc(t, 'Household items');
    t := _tx(v_user, 1, date_trunc('day', v_now) - interval '2 days' + interval '17 hours', grp);
    PERFORM _entry(t, gbp, acc_current, -4.10, 31); PERFORM _desc(t, 'Bakery & snacks');

    RAISE NOTICE 'Showcase data seeded for default user.';
END $do$;

DROP FUNCTION _spend(uuid, uuid, int, numeric, int, timestamptz, text);
DROP FUNCTION _income(uuid, uuid, int, numeric, int, timestamptz, text);
DROP FUNCTION _cashin(uuid, uuid, int, numeric, timestamptz);
DROP FUNCTION _cashout(uuid, uuid, int, numeric, timestamptz);
DROP FUNCTION _cashxfer(uuid, uuid, uuid, int, numeric, int, timestamptz);
DROP FUNCTION _buy(uuid, uuid, int, numeric, int, numeric, numeric, timestamptz);
DROP FUNCTION _sell(uuid, uuid, int, numeric, int, numeric, numeric, timestamptz);
DROP FUNCTION _trade(uuid, uuid, int, numeric, int, numeric, int, numeric, timestamptz);
DROP FUNCTION _xferin(uuid, uuid, int, numeric, timestamptz);
DROP FUNCTION _xferout(uuid, uuid, int, numeric, timestamptz);
DROP FUNCTION _balxfer(uuid, uuid, uuid, int, numeric, timestamptz);
DROP FUNCTION _cashdiv(uuid, uuid, int, numeric, int, numeric, timestamptz);
DROP FUNCTION _assetdiv(uuid, uuid, int, numeric, timestamptz);
DROP FUNCTION _acctfee(uuid, uuid, int, numeric, timestamptz);
DROP FUNCTION _seed_rates(int, numeric, numeric, numeric, numeric, numeric);
DROP FUNCTION _seed_flat_rates(int, numeric[]);
DROP FUNCTION _seed_asset(int, text, text, text, int, uuid);
DROP FUNCTION _seed_pair_id(int, int);
DROP FUNCTION _tx(uuid, int, timestamptz, uuid);
DROP FUNCTION _entry(uuid, int, uuid, numeric, int);
DROP FUNCTION _desc(uuid, text);
