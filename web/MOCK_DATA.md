# Mocked data in the Sverto web app

**Generated from `src/lib/mock/registry.ts` — do not edit by hand.**
Regenerate with `bun src/lib/mock/generate-report.ts` from `web/`.
A test (`src/lib/mock/report.test.ts`) fails if this file and the registry disagree,
and a second test fails if a mock module exports anything the registry does not list.

Every figure listed here is invented. Nothing else in the app is: if a surface is not
named below, it is drawn from the API.

**Markers are on in every build, development and production.** Each mocked surface
carries a `data-mock="<id>"` attribute naming its entry below, and — wherever the node is
hoverable — a plain-language title disclosing the figures as an example. Where the
layout has room the surface also carries a small `EXAMPLE` badge. Where it has none (the
review-queue count in the rail, the bottom tabs and the profile dot) the badge itself is
drawn hollow and dashed instead of solid, and its accessible name ends in `(example data)`:
a solid badge is a real count, a dashed one is invented. This app is pre-release and gets
screenshotted — an invented financial figure must never be indistinguishable from a real
one, least of all in a build handed to someone else.

The one escape hatch is `VITE_HIDE_MOCK_MARKERS=true` at build time, for a deliberate
marketing capture. It hides the visible marker only — `data-mock` stays on every mocked
node in every build, so any build can be audited with
`document.querySelectorAll("[data-mock]")`.

Mock amounts are plain numbers with no currency baked in — screens render them through
`<Figure>` in the user's own reference currency. Every amount is scaled from one
internally consistent ledger (`src/lib/mock/ledger.ts`), the same one the design handoff
uses, so mocked figures agree with each other: the five attribution buckets sum to the
header delta, and the per-holding period column sums to the Market bucket.

No mocked figure may headline a screen. A mock sits beside or below the real data it
stands in for, never above it and never in the largest type on the page, and a mock
control that cannot act is disabled or is not drawn at all. Being registered and badged
is not a licence to lead with an invented number.

## What the classifications mean

- **DERIVABLE** — The frontend could compute this from endpoints that already exist. It is mocked only because the derivation is not built yet.
- **DERIVABLE-EXPENSIVE** — The frontend could compute this, but only by downloading far more than the screen needs (full-ledger sweeps, N+1 per-asset calls). Shipping the derivation would be a performance defect.
- **BACKEND** — No endpoint supplies this and no honest client-side derivation exists. It cannot stop being a mock until the server changes.

## Summary

13 mocked surfaces across 8 areas.

| Classification      | Surfaces |
| ------------------- | -------- |
| DERIVABLE           | 0        |
| DERIVABLE-EXPENSIVE | 1        |
| BACKEND             | 12       |

Capability gaps covered: A1, A3, B6, C1, C2, C3, C4c, C5, D1, D2, D5, E2, E5, F5 (see `.recon/capability.md`).

## App shell

### Every mocked figure in the app

- **Id** `shared.ledger-anchor`
- **Gap** A1 Five-bucket net-worth attribution · **BACKEND**
- **Stands in for** The one plausible ledger the design handoff derives all of its figures from — net worth, assets, liabilities, liquid cash, the 30-day delta and the transaction counts.
- **Why it is mocked** Not a screen mock in itself: it is the single set of anchor figures every other mock in this registry is scaled from, so mocked surfaces stay arithmetically consistent with one another instead of each inventing its own scale.
- **Backend work that removes it** Nothing directly. It disappears when the mocks that consume it disappear.
- **Code** `src/lib/mock/ledger.ts` — `MOCK_LEDGER`, `mockRound`, `mockSharePercent`, `mockSeededRandom`
- **Rendered by** Nothing renders it yet.

## Dashboard

### "Why ▾" disclosure and the hero split sentence

- **Id** `dashboard.attribution`
- **Gap** A1 Five-bucket net-worth attribution · D1 No base-currency amount on any transaction · **BACKEND**
- **Stands in for** Five-bucket net-worth attribution over the selected window — Money in, Spending, Market, Income, Fees — with the From cash flow / From assets subtotals, per-bucket share bars and notes.
- **Why it is mocked** No endpoint returns windowed attribution. /portfolio/history is a single (date, rate) series; /portfolio/overview is lifetime-only. Deriving it client-side means downloading every transaction in the window AND an FX series per (asset, base) pair, because transaction entries carry no base-currency amount (D1).
- **Backend work that removes it** An attribution endpoint, e.g. GET /portfolio/attribution?from&to&default_asset_id returning the five signed bucket totals plus per-bucket counts, in the user's base currency. The DAL aggregator dal/src/queries/ai_queries.rs:299 aggregate_transactions already does most of the grouping and is only reachable through an AI tool.
- **Code** `src/lib/mock/dashboard.ts` — `mockNetWorthAttribution`, `MOCK_NET_WORTH_ATTRIBUTION`, `MOCK_ATTRIBUTION_FOOTNOTE`
- **Rendered by** `src/features/dashboard/api/attribution.ts`

## Transactions

### Review queue — the Myra proposal items and their card

- **Id** `transactions.review-proposals`
- **Gap** A3 "Needs you" Myra proposal count · B6 Review queue as one stream over three sources · **BACKEND**
- **Stands in for** Pending Myra write proposals waiting for approval: the drafted transaction, the prompt that produced it, the entries it would write and which conversation it came from. The other two sources in the same queue are real — unreviewed ghost transactions come from the ledger, receipts from GET /ai/quick-upload.
- **Why it is mocked** A pending proposal is an AssistantToolCall with no matching ToolResult or ToolApproval, and there is no cross-conversation query for one. Finding them client-side means fetching all 50 conversations and then every message of each, and there would still be no endpoint to approve one from outside its conversation.
- **Backend work that removes it** A pending-approvals endpoint over ai_messages (list + approve/deny by id), returning the drafted transaction, its source conversation and the tool call that drafted it. Then buildProposalItems reads it and the queue drops its marker; the ledger and receipt halves of the queue are unaffected.
- **Code** `src/lib/mock/review.ts` — `MOCK_REVIEW_PROPOSALS`, `MOCK_REVIEW_PROPOSAL_SOURCE`
- **Rendered by** `src/features/transactions/review/api/proposals.ts`

## Transaction editors

### Transaction editor opened on a Myra proposal — the provenance dots, the corrected-field marks and the correction transcript

- **Id** `editors.myra-proposal`
- **Gap** A3 "Needs you" Myra proposal count · F5 Approval-queue paging and approve-all copy · **BACKEND**
- **Stands in for** A pending Myra write proposal as the editor needs it: which fields Myra filled, what each corrected field held before, and the exchange that produced them. The transaction the editor saves is real — only the proposal it starts from is invented.
- **Why it is mocked** A pending proposal is an AssistantToolCall with no matching ToolResult or ToolApproval, and there is no cross-conversation query for one. Nothing in the API records which fields an AI filled or what a field held before a correction, so provenance cannot be derived even once a proposal can be fetched.
- **Backend work that removes it** The pending-approvals endpoint over ai_messages, extended with per-field provenance on the drafted transaction (which fields the model set, and the prior value of any it revised), plus a route that accepts a correction for a proposal outside its own conversation. Then editorProposal() reads it, the composer stops refusing, and the marks drop on their own.
- **Code** `src/lib/mock/editor.ts` — `MOCK_EDITOR_PROPOSAL`, `MOCK_EDITOR_PROPOSAL_COMPOSER_REFUSAL`
- **Rendered by** `src/features/transactions/editor/proposal.ts`

## Portfolio & assets

### Holdings table "30 days" column, beside the lifetime column

- **Id** `portfolio.period-column`
- **Gap** C1 Holdings period column that sums to the Market figure · **BACKEND**
- **Stands in for** Per-holding price movement over the window — units held at the period start × (price now − price then) — which must sum to the Market bucket of the attribution panel.
- **Why it is mocked** This needs a historical position. /portfolio/holdings is current-only, /portfolio/overview is lifetime-only, /portfolio/history has no per-asset breakdown. Approximating with today's units and a price delta is wrong for exactly the holdings that were traded in the window — the case the column exists to explain.
- **Backend work that removes it** Extend the overview with a window: GET /portfolio/overview?from&to returning per (asset, account) the opening units, opening value and period market change.
- **Code** `src/lib/mock/portfolio.ts` — `MOCK_HOLDING_PERIOD_CHANGES`, `mockHoldingPeriodChange`
- **Rendered by** `src/features/portfolio/period.ts`

### "Why it moved" panel on portfolio, asset and account detail

- **Id** `portfolio.why-it-moved`
- **Gap** C2 "Why it moved" — Contributions / Market / Dividends / Fees · C3 Arbitrary attribution ranges · D1 No base-currency amount on any transaction · **BACKEND**
- **Stands in for** Contributions / Market / Dividends / Fees over the window, with the From cash flow and From assets subtotals and their printed arithmetic.
- **Why it is mocked** Same as dashboard.attribution, scoped to the portfolio. Dividends and fees exist only as lifetime totals (cash_dividends, total_fees) and are never windowed. History endpoints also accept only the fixed range enum, so the design's arbitrary '26 Jun – 26 Jul 2026' window cannot be requested (C3).
- **Backend work that removes it** The attribution endpoint scoped by portfolio/account/asset, plus arbitrary from/to on the history and overview endpoints.
- **Code** `src/lib/mock/portfolio.ts` — `mockPortfolioAttribution`, `MOCK_PORTFOLIO_ATTRIBUTION`
- **Rendered by** `src/features/portfolio/attribution.ts`

### Asset-detail tiles — "2 sales", "4 payments", "across 4 lots"

- **Id** `portfolio.lot-counters`
- **Gap** C4c Sale, dividend-payment and fee-lot counters · **BACKEND**
- **Stands in for** The number of sales behind realised P&L, the number of dividend payments, and how many lots carried fees.
- **Why it is mocked** positions[] carries amount_sold and sale_proceeds but no sale count, and cash_dividends has no payment count. Nothing in the overview response counts events.
- **Backend work that removes it** Add sale_count / dividend_payment_count to the asset portfolio view model (both are one COUNT in the existing overview query). Held since is already derivable from min(add_date) and is not mocked.
- **Code** `src/lib/mock/portfolio.ts` — `MOCK_LOT_COUNTS`, `mockLotCounts`
- **Rendered by** Nothing renders it yet.

### Header strip "prices as of …" and the degraded (stale prices) state

- **Id** `portfolio.prices-as-of`
- **Gap** C5 Degraded / stale-prices state and the prices as-of timestamp · **DERIVABLE-EXPENSIVE**
- **Stands in for** The timestamp the market values in /portfolio/overview were priced at, and whether they are stale.
- **Why it is mocked** /portfolio/overview returns market_value as a bare Decimal with no as-of and no staleness flag. Per-pair last_updated does exist on GET /api/assets/{a}/{ref}/converted, so it is derivable — at one extra request per holding.
- **Backend work that removes it** Add priced_as_of (and ideally a per-asset as-of) to GetPortfolioOverviewViewModel. Then the banner reads a real timestamp and mockPricesAsOf is deleted.
- **Code** `src/lib/mock/portfolio.ts` — `MOCK_PRICES_AGE_MINUTES`, `MOCK_STALE_PRICES_AGE_MINUTES`, `MOCK_STALE_PRICE_THRESHOLD_MINUTES`, `mockPricesAsOf`, `mockPricesAreStale`
- **Rendered by** `src/features/portfolio/prices.ts`

## Accounts

### Dashed fold row "2 deactivated accounts · Revolut Current · …"

- **Id** `accounts.deactivated-fold`
- **Gap** D2 Deactivated accounts fold rather than vanish · **BACKEND**
- **Stands in for** The soft-deleted accounts, so deactivation folds rather than vanishes.
- **Why it is mocked** DELETE /accounts/{id} sets active = false, but GET /accounts filters to active = true with no opt-out (include_inactive is false in all three constructors) and the list view model has no active field, so a deactivated account is unreachable from the API.
- **Backend work that removes it** Add an include_inactive query param to GET /accounts and an active field to the account list view model.
- **Code** `src/lib/mock/accounts.ts` — `MOCK_DEACTIVATED_ACCOUNTS`
- **Rendered by** Nothing renders it yet.

### Accounts index subtitles, the mortgage page tiles and the side panel

- **Id** `accounts.financial-metadata`
- **Gap** D5 Account-level financial metadata (rate, term, principal, limit, institution) · **BACKEND**
- **Stands in for** Institution name, interest rate and rate term, original principal, monthly payment and payment day, term remaining, interest charged this year, credit limit, payment due date and the last valuation date.
- **Why it is mocked** The account table has exactly id, user_id, account_name, account_type, liquidity_type, active and ownership_share. None of this metadata exists anywhere in the schema; identifiers gives you a masked number and nothing else.
- **Backend work that removes it** New account metadata columns (or a per-account metadata table) plus the fields on GetAccountResponseViewModel and the account create/update requests.
- **Code** `src/lib/mock/accounts.ts` — `mockAccountMetadata`, `MOCK_ACCOUNT_METADATA_NAMES`
- **Rendered by** `src/features/accounts/account-tiles.tsx`, `src/features/accounts/account-facts.tsx`

## Settings

### Settings → Myra → What Myra may do (two toggles)

- **Id** `settings.myra-permissions`
- **Gap** E2 Myra permission toggles · **BACKEND**
- **Stands in for** The persisted booleans behind "Quick Upload" and "Use my history for suggestions". The third row, "Approval required for every write", is structural and needs no storage.
- **Why it is mocked** There is no user-preferences table and no settings endpoint, so both toggles have nowhere to persist.
- **Backend work that removes it** A user preferences table plus GET/PUT /api/users/{user_id}/preferences. Until then the two switches render this mock's values and are disabled, because a switch that moves and then silently forgets would read as a setting that sticks.
- **Code** `src/lib/mock/settings.ts` — `MOCK_MYRA_PERMISSIONS`
- **Rendered by** `src/features/settings/myra-section.tsx`

### Connection detail status row — "1,284 transactions imported in total"

- **Id** `settings.connection-import-totals`
- **Gap** E5 Lifetime transactions-imported count on a connection · **BACKEND**
- **Stands in for** The lifetime count of transactions imported by a connection.
- **Why it is mocked** SyncReportViewModel is per-run only. Nothing accumulates a lifetime count per connection or per binding.
- **Backend work that removes it** Accumulate an imported_total on the binding (or COUNT over connector_transaction by binding) and return it on GET /connectors/connections/{id} and /connectors/bindings.
- **Code** `src/lib/mock/settings.ts` — `mockConnectionImportTotal`, `MOCK_CONNECTION_IMPORT_TOTALS`
- **Rendered by** Nothing renders it yet.

## Landing page

### Every figure on the public landing page — the hero product shot, the derivation diagram, the July multi-currency table, the VWCE.DE lot table, Myra's drafted receipt and the two client frames

- **Id** `landing.demo-ledger`
- **Gap** A1 Five-bucket net-worth attribution · D1 No base-currency amount on any transaction · **BACKEND**
- **Stands in for** One illustrative ledger with EUR as its reference currency and a net worth of €221,483.06, reused across every section so the sections agree with each other.
- **Why it is mocked** The landing page is public: there is no signed-in user and no ledger to read, so every figure on it illustrates the product rather than reporting anything. Two of its panels would be unbuildable from the API even for a real user — the hero's "you saved / your assets earned" split is windowed attribution (A1), and the July table's EUR column needs a base-currency amount per transaction (D1). Marked with data-mock only: the visible MOCK badge is deliberately suppressed here and replaced by a plain-language caption under the product shot, because a badge reading MOCK on a marketing page is read as a product state rather than as a disclosure.
- **Backend work that removes it** None — this is illustration, not a stand-in for a user's data, so no endpoint retires it. A public demo-ledger endpoint (the "Try the demo ledger" call to action) would let the page render a real seeded ledger instead. It is registered so a marketing build stays auditable with document.querySelectorAll("[data-mock]"). Its consumers are the static marketing site in landing/, which reads this module across the @/* alias, so they are outside the consumer list this registry can scan.
- **Code** `src/lib/mock/landing.ts` — `mockLandingMoney`, `MOCK_LANDING_REFERENCE_CURRENCY`, `MOCK_LANDING_SNAPSHOT`, `MOCK_LANDING_TRADE`, `MOCK_LANDING_JULY`, `MOCK_LANDING_POSITION`, `MOCK_LANDING_PROPOSAL`, `MOCK_LANDING_CLIENTS`
- **Rendered by** Nothing renders it yet.

## Capability gaps with no mock

Every remaining gap in `.recon/capability.md`. None of these is faked anywhere: a screen
either derives the value from endpoints that exist, or the surface is dropped until the
backend supplies it. If a screen needs one of them it must add a registry entry above —
inlining the number in a component fails `src/lib/mock/registry.test.ts`.

- **A2** "Needs you" ghost-import count
- **A4** Accounts panel grouped by class with per-group subtotals
- **A5** Greeting line counts ("13 accounts, 8 things waiting")
- **B1** Typed query tokens (date range, account, category, type, amount)
- **B2** Daily-flow chart (per-day out/in bars that double as the date brush)
- **B3** Slice answers — Net / Out / In / Average
- **B4** Group-by pivot subtotals and share bars
- **B5** Category and Type columns for non-Regular transactions
- **B7** Raw provider source beside the cleaned version in Review
- **B8** Per-day net on the day band
- **B9** Empty-because-filtered vs no-data-empty
- **C4a** Cross-account FIFO lot ordering
- **C4b** Per-lot percentage return
- **C6** Composition lens "Currency"
- **C7** "6 assets · 5 accounts" subtitle and largest-holding share
- **D3** "Liquid today" figure
- **D4** Liabilities are not modelled as negative
- **D6** Assets vs liabilities split on the accounts index
- **D7** Generated API client is stale
- **D8** Four endpoints absent from the OpenAPI spec
- **E1** Category usage counts and type counts
- **E3** Danger zone — account deletion and data export
- **E4** Custom-asset last-valued date and current value
- **E6** Provider catalogue cards
- **F1** Answer cards as structured data
- **F2** Provenance line (as-of, count, scope)
- **F3** "Open these →" into a filtered ledger
- **F4** Pinned answers need a stable message id
- **F6** Denied-proposal receipt
- **F7** Quota percentage in the chat header
- **F8** Conversation list capped at 50 with no paging
- **G1** Sign-in and sign-up exist only under the database auth feature
- **G2** Per-currency rate on the base-currency step
- **G3** The wizard's three ways to get data in

## Adding a mock

1. Put the data in `src/lib/mock/<area>.ts` as a `MOCK_*` constant or a `mock*` factory.
   Never inline a fake number in a component.
2. Add a `defineMock({ … })` entry to `src/lib/mock/registry.ts`. The type will not let you
   omit the gap id, the classification, the reason or the backend work that would remove it.
3. Mark the surface with `mockAttributes(id)` (or `mockMarkerProps(id)` for a seam that is
   only sometimes mocked) and, where it fits, `<MockBadge id={id} />`.
4. List the file that renders it in that entry's `consumers`.
5. Run `bun src/lib/mock/generate-report.ts` to refresh this file.

`src/lib/mock/registry.test.ts` fails if a mock module exports anything the registry does
not list, if a file imports mock data without being listed as a consumer of it, or if a
declared consumer never quotes the id it must mark its surface with. A mock therefore
cannot reach a screen without appearing here, and cannot appear on screen unmarked.
