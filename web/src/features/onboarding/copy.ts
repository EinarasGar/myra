export const WELCOME_STEP_TITLE = "Welcome"
export const WELCOME_STEP_BODY = "How Sverto thinks about your money."

export const CURRENCY_STEP_TITLE = "Base currency"
export const CURRENCY_STEP_BODY = "The one everything converts into."

export const START_STEP_TITLE = "Start"
export const START_STEP_BODY = "Get your first transactions in."

export const WELCOME_TITLE = "One ledger for all of it"

export const WELCOME_INTRO =
  "Three things worth knowing before you start — they explain why Sverto behaves the way it does."

export const WELCOME_POINTS = [
  {
    glyph: "≡",
    title: "Everything is a transaction",
    body: "Groceries, salary, a transfer between your accounts, an ETF purchase with its fee. Each one holds signed entries, so both sides of an event are always recorded.",
  },
  {
    glyph: "∑",
    title: "Every number is derived, never stored",
    body: "Balances, holdings, portfolio performance and net worth are recomputed from the ledger each time you look. Nothing can drift out of sync.",
  },
  {
    glyph: "✧",
    title: "Nothing writes without you",
    body: "Bank imports can wait for review, and Myra always proposes rather than saves. You stay the only author of your ledger.",
  },
] as const

export const WELCOME_NEXT = "Continue"
export const WELCOME_NAV_NOTE = "takes about a minute"

export const CURRENCY_TITLE = "Pick the currency you think in"

export const CURRENCY_INTRO =
  "Every total — balances, portfolio value, net worth — converts into this one. Accounts keep their own currencies, and you can change this later without touching a single transaction."

export const CURRENCY_FOOTNOTE =
  "Rates come from market data and refresh daily. Custom assets you create later can be priced against any of these."

export const CURRENCY_NAV_NOTE = "changeable in Settings → General"

export const CURRENCY_SEARCH_PLACEHOLDER = "Search currencies"

export const CURRENCY_NO_MATCH = "No currency matches that search."

export const CURRENCY_PENDING = "Saving…"

export const CURRENCY_SAVED_NOTE =
  "Saved. Every total from here on is expressed in it."

export const START_TITLE = "Get something in the ledger"

export const START_INTRO =
  "Pick whichever is easiest — you can do the others any time, and none of them lock you in."

export const START_FOOTNOTE =
  "These are the same three routes the dashboard offers whenever your ledger is empty, so nothing here is a one-time offer."

export const START_SKIP = "Skip for now"

export const START_NAV_NOTE = "or skip — the dashboard will offer these again"

export const START_PENDING = "Finishing setup…"

export const BACK = "Back"

export const STEP_LABEL = (index: number, total: number) =>
  `Step ${index} of ${total}`
