import {
  defineMock,
  MOCK_SCREENS,
  type MockEntry,
  type MockScreen,
} from "./types"

export const mockRegistry = [
  defineMock({
    id: "shared.ledger-anchor",
    screen: "shell",
    surface: "Every mocked figure in the app",
    standsInFor:
      "The one plausible ledger the design handoff derives all of its figures from — net worth, assets, liabilities, liquid cash, the 30-day delta and the transaction counts.",
    gaps: ["A1"],
    kind: "BACKEND",
    reason:
      "Not a screen mock in itself: it is the single set of anchor figures every other mock in this registry is scaled from, so mocked surfaces stay arithmetically consistent with one another instead of each inventing its own scale.",
    backendWork:
      "Nothing directly. It disappears when the mocks that consume it disappear.",
    module: "src/lib/mock/ledger.ts",
    exports: [
      "MOCK_LEDGER",
      "mockRound",
      "mockSharePercent",
      "mockSeededRandom",
    ],
    consumers: [],
  }),
  defineMock({
    id: "dashboard.attribution",
    screen: "dashboard",
    surface: '"Why ▾" disclosure and the hero split sentence',
    standsInFor:
      "Five-bucket net-worth attribution over the selected window — Money in, Spending, Market, Income, Fees — with the From cash flow / From assets subtotals, per-bucket share bars and notes.",
    gaps: ["A1", "D1"],
    kind: "BACKEND",
    reason:
      "No endpoint returns windowed attribution. /portfolio/history is a single (date, rate) series; /portfolio/overview is lifetime-only. Deriving it client-side means downloading every transaction in the window AND an FX series per (asset, base) pair, because transaction entries carry no base-currency amount (D1).",
    backendWork:
      "An attribution endpoint, e.g. GET /portfolio/attribution?from&to&default_asset_id returning the five signed bucket totals plus per-bucket counts, in the user's base currency. The DAL aggregator dal/src/queries/ai_queries.rs:299 aggregate_transactions already does most of the grouping and is only reachable through an AI tool.",
    module: "src/lib/mock/dashboard.ts",
    exports: [
      "mockNetWorthAttribution",
      "MOCK_NET_WORTH_ATTRIBUTION",
      "MOCK_ATTRIBUTION_FOOTNOTE",
    ],
    consumers: ["src/features/dashboard/api/attribution.ts"],
  }),
  defineMock({
    id: "transactions.review-proposals",
    screen: "transactions",
    surface: "Review queue — the Myra proposal items and their card",
    standsInFor:
      "Pending Myra write proposals waiting for approval: the drafted transaction, the prompt that produced it, the entries it would write and which conversation it came from. The other two sources in the same queue are real — unreviewed ghost transactions come from the ledger, receipts from GET /ai/quick-upload.",
    gaps: ["A3", "B6"],
    kind: "BACKEND",
    reason:
      "A pending proposal is an AssistantToolCall with no matching ToolResult or ToolApproval, and there is no cross-conversation query for one. Finding them client-side means fetching all 50 conversations and then every message of each, and there would still be no endpoint to approve one from outside its conversation.",
    backendWork:
      "A pending-approvals endpoint over ai_messages (list + approve/deny by id), returning the drafted transaction, its source conversation and the tool call that drafted it. Then buildProposalItems reads it and the queue drops its marker; the ledger and receipt halves of the queue are unaffected.",
    module: "src/lib/mock/review.ts",
    exports: ["MOCK_REVIEW_PROPOSALS", "MOCK_REVIEW_PROPOSAL_SOURCE"],
    consumers: ["src/features/transactions/review/api/proposals.ts"],
  }),
  defineMock({
    id: "editors.myra-proposal",
    screen: "editors",
    surface:
      "Transaction editor opened on a Myra proposal — the provenance dots, the corrected-field marks and the correction transcript",
    standsInFor:
      "A pending Myra write proposal as the editor needs it: which fields Myra filled, what each corrected field held before, and the exchange that produced them. The transaction the editor saves is real — only the proposal it starts from is invented.",
    gaps: ["A3", "F5"],
    kind: "BACKEND",
    reason:
      "A pending proposal is an AssistantToolCall with no matching ToolResult or ToolApproval, and there is no cross-conversation query for one. Nothing in the API records which fields an AI filled or what a field held before a correction, so provenance cannot be derived even once a proposal can be fetched.",
    backendWork:
      "The pending-approvals endpoint over ai_messages, extended with per-field provenance on the drafted transaction (which fields the model set, and the prior value of any it revised), plus a route that accepts a correction for a proposal outside its own conversation. Then editorProposal() reads it, the composer stops refusing, and the marks drop on their own.",
    module: "src/lib/mock/editor.ts",
    exports: ["MOCK_EDITOR_PROPOSAL", "MOCK_EDITOR_PROPOSAL_COMPOSER_REFUSAL"],
    consumers: ["src/features/transactions/editor/proposal.ts"],
  }),
  defineMock({
    id: "portfolio.period-column",
    screen: "portfolio",
    surface: 'Holdings table "30 days" column, beside the lifetime column',
    standsInFor:
      "Per-holding price movement over the window — units held at the period start × (price now − price then) — which must sum to the Market bucket of the attribution panel.",
    gaps: ["C1"],
    kind: "BACKEND",
    reason:
      "This needs a historical position. /portfolio/holdings is current-only, /portfolio/overview is lifetime-only, /portfolio/history has no per-asset breakdown. Approximating with today's units and a price delta is wrong for exactly the holdings that were traded in the window — the case the column exists to explain.",
    backendWork:
      "Extend the overview with a window: GET /portfolio/overview?from&to returning per (asset, account) the opening units, opening value and period market change.",
    module: "src/lib/mock/portfolio.ts",
    exports: ["MOCK_HOLDING_PERIOD_CHANGES", "mockHoldingPeriodChange"],
    consumers: ["src/features/portfolio/period.ts"],
  }),
  defineMock({
    id: "portfolio.why-it-moved",
    screen: "portfolio",
    surface: '"Why it moved" panel on portfolio, asset and account detail',
    standsInFor:
      "Contributions / Market / Dividends / Fees over the window, with the From cash flow and From assets subtotals and their printed arithmetic.",
    gaps: ["C2", "C3", "D1"],
    kind: "BACKEND",
    reason:
      "Same as dashboard.attribution, scoped to the portfolio. Dividends and fees exist only as lifetime totals (cash_dividends, total_fees) and are never windowed. History endpoints also accept only the fixed range enum, so the design's arbitrary '26 Jun – 26 Jul 2026' window cannot be requested (C3).",
    backendWork:
      "The attribution endpoint scoped by portfolio/account/asset, plus arbitrary from/to on the history and overview endpoints.",
    module: "src/lib/mock/portfolio.ts",
    exports: ["mockPortfolioAttribution", "MOCK_PORTFOLIO_ATTRIBUTION"],
    consumers: ["src/features/portfolio/attribution.ts"],
  }),
  defineMock({
    id: "portfolio.lot-counters",
    screen: "portfolio",
    surface: 'Asset-detail tiles — "2 sales", "4 payments", "across 4 lots"',
    standsInFor:
      "The number of sales behind realised P&L, the number of dividend payments, and how many lots carried fees.",
    gaps: ["C4c"],
    kind: "BACKEND",
    reason:
      "positions[] carries amount_sold and sale_proceeds but no sale count, and cash_dividends has no payment count. Nothing in the overview response counts events.",
    backendWork:
      "Add sale_count / dividend_payment_count to the asset portfolio view model (both are one COUNT in the existing overview query). Held since is already derivable from min(add_date) and is not mocked.",
    module: "src/lib/mock/portfolio.ts",
    exports: ["MOCK_LOT_COUNTS", "mockLotCounts"],
    consumers: [],
  }),
  defineMock({
    id: "portfolio.prices-as-of",
    screen: "portfolio",
    surface:
      'Header strip "prices as of …" and the degraded (stale prices) state',
    standsInFor:
      "The timestamp the market values in /portfolio/overview were priced at, and whether they are stale.",
    gaps: ["C5"],
    kind: "DERIVABLE-EXPENSIVE",
    reason:
      "/portfolio/overview returns market_value as a bare Decimal with no as-of and no staleness flag. Per-pair last_updated does exist on GET /api/assets/{a}/{ref}/converted, so it is derivable — at one extra request per holding.",
    backendWork:
      "Add priced_as_of (and ideally a per-asset as-of) to GetPortfolioOverviewViewModel. Then the banner reads a real timestamp and mockPricesAsOf is deleted.",
    module: "src/lib/mock/portfolio.ts",
    exports: [
      "MOCK_PRICES_AGE_MINUTES",
      "MOCK_STALE_PRICES_AGE_MINUTES",
      "MOCK_STALE_PRICE_THRESHOLD_MINUTES",
      "mockPricesAsOf",
      "mockPricesAreStale",
    ],
    consumers: ["src/features/portfolio/prices.ts"],
  }),
  defineMock({
    id: "accounts.deactivated-fold",
    screen: "accounts",
    surface: 'Dashed fold row "2 deactivated accounts · Revolut Current · …"',
    standsInFor:
      "The soft-deleted accounts, so deactivation folds rather than vanishes.",
    gaps: ["D2"],
    kind: "BACKEND",
    reason:
      "DELETE /accounts/{id} sets active = false, but GET /accounts filters to active = true with no opt-out (include_inactive is false in all three constructors) and the list view model has no active field, so a deactivated account is unreachable from the API.",
    backendWork:
      "Add an include_inactive query param to GET /accounts and an active field to the account list view model.",
    module: "src/lib/mock/accounts.ts",
    exports: ["MOCK_DEACTIVATED_ACCOUNTS"],
    consumers: [],
  }),
  defineMock({
    id: "accounts.financial-metadata",
    screen: "accounts",
    surface:
      "Accounts index subtitles, the mortgage page tiles and the side panel",
    standsInFor:
      "Institution name, interest rate and rate term, original principal, monthly payment and payment day, term remaining, interest charged this year, credit limit, payment due date and the last valuation date.",
    gaps: ["D5"],
    kind: "BACKEND",
    reason:
      "The account table has exactly id, user_id, account_name, account_type, liquidity_type, active and ownership_share. None of this metadata exists anywhere in the schema; identifiers gives you a masked number and nothing else.",
    backendWork:
      "New account metadata columns (or a per-account metadata table) plus the fields on GetAccountResponseViewModel and the account create/update requests.",
    module: "src/lib/mock/accounts.ts",
    exports: ["mockAccountMetadata", "MOCK_ACCOUNT_METADATA_NAMES"],
    consumers: [
      "src/features/accounts/account-tiles.tsx",
      "src/features/accounts/account-facts.tsx",
    ],
  }),
  defineMock({
    id: "settings.myra-permissions",
    screen: "settings",
    surface: "Settings → Myra → What Myra may do (two toggles)",
    standsInFor:
      'The persisted booleans behind "Quick Upload" and "Use my history for suggestions". The third row, "Approval required for every write", is structural and needs no storage.',
    gaps: ["E2"],
    kind: "BACKEND",
    reason:
      "There is no user-preferences table and no settings endpoint, so both toggles have nowhere to persist.",
    backendWork:
      "A user preferences table plus GET/PUT /api/users/{user_id}/preferences. Until then the two switches render this mock's values and are disabled, because a switch that moves and then silently forgets would read as a setting that sticks.",
    module: "src/lib/mock/settings.ts",
    exports: ["MOCK_MYRA_PERMISSIONS"],
    consumers: ["src/features/settings/myra-section.tsx"],
  }),
  defineMock({
    id: "settings.connection-import-totals",
    screen: "settings",
    surface:
      'Connection detail status row — "1,284 transactions imported in total"',
    standsInFor: "The lifetime count of transactions imported by a connection.",
    gaps: ["E5"],
    kind: "BACKEND",
    reason:
      "SyncReportViewModel is per-run only. Nothing accumulates a lifetime count per connection or per binding.",
    backendWork:
      "Accumulate an imported_total on the binding (or COUNT over connector_transaction by binding) and return it on GET /connectors/connections/{id} and /connectors/bindings.",
    module: "src/lib/mock/settings.ts",
    exports: ["mockConnectionImportTotal", "MOCK_CONNECTION_IMPORT_TOTALS"],
    consumers: [],
  }),
  defineMock({
    id: "landing.demo-ledger",
    screen: "landing",
    surface:
      "Every figure on the public landing page — the hero product shot, the derivation diagram, the July multi-currency table, the VWCE.DE lot table, Myra's drafted receipt and the two client frames",
    standsInFor:
      "One illustrative ledger with EUR as its reference currency and a net worth of €221,483.06, reused across every section so the sections agree with each other.",
    gaps: ["A1", "D1"],
    kind: "BACKEND",
    reason:
      "The landing page is public: there is no signed-in user and no ledger to read, so every figure on it illustrates the product rather than reporting anything. Two of its panels would be unbuildable from the API even for a real user — the hero's \"you saved / your assets earned\" split is windowed attribution (A1), and the July table's EUR column needs a base-currency amount per transaction (D1). Marked with data-mock only: the visible MOCK badge is deliberately suppressed here and replaced by a plain-language caption under the product shot, because a badge reading MOCK on a marketing page is read as a product state rather than as a disclosure.",
    backendWork:
      'None — this is illustration, not a stand-in for a user\'s data, so no endpoint retires it. A public demo-ledger endpoint (the "Try the demo ledger" call to action) would let the page render a real seeded ledger instead. It is registered so a marketing build stays auditable with document.querySelectorAll("[data-mock]"). Its consumers are the static marketing site in landing/, which reads this module across the @/* alias, so they are outside the consumer list this registry can scan.',
    module: "src/lib/mock/landing.ts",
    exports: [
      "mockLandingMoney",
      "MOCK_LANDING_REFERENCE_CURRENCY",
      "MOCK_LANDING_SNAPSHOT",
      "MOCK_LANDING_TRADE",
      "MOCK_LANDING_JULY",
      "MOCK_LANDING_POSITION",
      "MOCK_LANDING_PROPOSAL",
      "MOCK_LANDING_CLIENTS",
    ],
    consumers: [],
  }),
] satisfies readonly MockEntry[]

const seen = new Set<string>()
for (const entry of mockRegistry) {
  if (seen.has(entry.id)) {
    throw new Error(`Duplicate mock id "${entry.id}".`)
  }
  seen.add(entry.id)
}

export type MockId = (typeof mockRegistry)[number]["id"]

export function getMockEntry(id: MockId): MockEntry {
  const entry = mockRegistry.find((candidate) => candidate.id === id)
  if (!entry) {
    throw new Error(`Unknown mock id "${id}".`)
  }
  return entry
}

export function mockEntriesForScreen(screen: MockScreen): MockEntry[] {
  return mockRegistry.filter((entry) => entry.screen === screen)
}

export function mockScreensWithEntries(): MockScreen[] {
  return MOCK_SCREENS.filter((screen) =>
    mockRegistry.some((entry) => entry.screen === screen)
  )
}
