export const MOCK_SCREENS = [
  "shell",
  "dashboard",
  "transactions",
  "editors",
  "portfolio",
  "accounts",
  "settings",
  "myra",
  "onboarding",
  "landing",
] as const

export type MockScreen = (typeof MOCK_SCREENS)[number]

export const MOCK_SCREEN_TITLES: Record<MockScreen, string> = {
  shell: "App shell",
  dashboard: "Dashboard",
  transactions: "Transactions",
  editors: "Transaction editors",
  portfolio: "Portfolio & assets",
  accounts: "Accounts",
  settings: "Settings",
  myra: "Myra",
  onboarding: "Onboarding & auth",
  landing: "Landing page",
}

export const MOCK_KINDS = [
  "DERIVABLE",
  "DERIVABLE-EXPENSIVE",
  "BACKEND",
] as const

export type MockKind = (typeof MOCK_KINDS)[number]

export const MOCK_KIND_MEANINGS: Record<MockKind, string> = {
  DERIVABLE:
    "The frontend could compute this from endpoints that already exist. It is mocked only because the derivation is not built yet.",
  "DERIVABLE-EXPENSIVE":
    "The frontend could compute this, but only by downloading far more than the screen needs (full-ledger sweeps, N+1 per-asset calls). Shipping the derivation would be a performance defect.",
  BACKEND:
    "No endpoint supplies this and no honest client-side derivation exists. It cannot stop being a mock until the server changes.",
}

export const GAP_IDS = [
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "B7",
  "B8",
  "B9",
  "C1",
  "C2",
  "C3",
  "C4a",
  "C4b",
  "C4c",
  "C5",
  "C6",
  "C7",
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
  "D7",
  "D8",
  "E1",
  "E2",
  "E3",
  "E4",
  "E5",
  "E6",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "G1",
  "G2",
  "G3",
] as const

export type GapId = (typeof GAP_IDS)[number]

export const GAP_TITLES: Record<GapId, string> = {
  A1: "Five-bucket net-worth attribution",
  A2: '"Needs you" ghost-import count',
  A3: '"Needs you" Myra proposal count',
  A4: "Accounts panel grouped by class with per-group subtotals",
  A5: 'Greeting line counts ("13 accounts, 8 things waiting")',
  B1: "Typed query tokens (date range, account, category, type, amount)",
  B2: "Daily-flow chart (per-day out/in bars that double as the date brush)",
  B3: "Slice answers — Net / Out / In / Average",
  B4: "Group-by pivot subtotals and share bars",
  B5: "Category and Type columns for non-Regular transactions",
  B6: "Review queue as one stream over three sources",
  B7: "Raw provider source beside the cleaned version in Review",
  B8: "Per-day net on the day band",
  B9: "Empty-because-filtered vs no-data-empty",
  C1: "Holdings period column that sums to the Market figure",
  C2: '"Why it moved" — Contributions / Market / Dividends / Fees',
  C3: "Arbitrary attribution ranges",
  C4a: "Cross-account FIFO lot ordering",
  C4b: "Per-lot percentage return",
  C4c: "Sale, dividend-payment and fee-lot counters",
  C5: "Degraded / stale-prices state and the prices as-of timestamp",
  C6: 'Composition lens "Currency"',
  C7: '"6 assets · 5 accounts" subtitle and largest-holding share',
  D1: "No base-currency amount on any transaction",
  D2: "Deactivated accounts fold rather than vanish",
  D3: '"Liquid today" figure',
  D4: "Liabilities are not modelled as negative",
  D5: "Account-level financial metadata (rate, term, principal, limit, institution)",
  D6: "Assets vs liabilities split on the accounts index",
  D7: "Generated API client is stale",
  D8: "Four endpoints absent from the OpenAPI spec",
  E1: "Category usage counts and type counts",
  E2: "Myra permission toggles",
  E3: "Danger zone — account deletion and data export",
  E4: "Custom-asset last-valued date and current value",
  E5: "Lifetime transactions-imported count on a connection",
  E6: "Provider catalogue cards",
  F1: "Answer cards as structured data",
  F2: "Provenance line (as-of, count, scope)",
  F3: '"Open these →" into a filtered ledger',
  F4: "Pinned answers need a stable message id",
  F5: "Approval-queue paging and approve-all copy",
  F6: "Denied-proposal receipt",
  F7: "Quota percentage in the chat header",
  F8: "Conversation list capped at 50 with no paging",
  G1: "Sign-in and sign-up exist only under the database auth feature",
  G2: "Per-currency rate on the base-currency step",
  G3: "The wizard's three ways to get data in",
}

export interface MockEntry {
  /** `<screen>.<surface>`, never renamed — `data-mock` and MOCK_DATA.md quote it. */
  readonly id: string
  readonly screen: MockScreen
  readonly surface: string
  readonly standsInFor: string
  readonly gaps: readonly [GapId, ...GapId[]]
  readonly kind: MockKind
  readonly reason: string
  /** The precise backend change that would delete this entry. */
  readonly backendWork: string
  readonly module: string
  /** Every runtime export of that module belonging to this entry. */
  readonly exports: readonly [string, ...string[]]
  /**
   * Repo-relative files that render this data. Empty until a screen consumes it;
   * registry.test.ts fails if a file consumes the data without being listed here,
   * or lists itself without quoting the id it must mark the surface with.
   */
  readonly consumers: readonly string[]
}

const NON_EMPTY_FIELDS = [
  "id",
  "surface",
  "standsInFor",
  "reason",
  "backendWork",
  "module",
] as const satisfies readonly (keyof MockEntry)[]

export function defineMock<const T extends MockEntry>(entry: T): T {
  for (const field of NON_EMPTY_FIELDS) {
    if (entry[field].trim() === "") {
      throw new Error(`Mock "${entry.id}" is missing ${field}.`)
    }
  }
  if (!entry.module.startsWith("src/lib/mock/")) {
    throw new Error(
      `Mock "${entry.id}" declares module "${entry.module}"; mocks live under src/lib/mock/.`
    )
  }
  for (const name of entry.exports) {
    if (!isMockExportName(name)) {
      throw new Error(
        `Mock "${entry.id}" exports "${name}"; mock exports are named MOCK_* or mock*.`
      )
    }
  }
  for (const consumer of entry.consumers) {
    if (!consumer.startsWith("src/") || consumer.startsWith("src/lib/mock/")) {
      throw new Error(
        `Mock "${entry.id}" lists consumer "${consumer}"; consumers are repo-relative src/ files outside src/lib/mock/.`
      )
    }
  }
  return entry
}

export function isMockExportName(name: string): boolean {
  return /^MOCK_[A-Z0-9_]+$/.test(name) || /^mock[A-Z]/.test(name)
}
