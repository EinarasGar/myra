export const HOLDINGS_FOOTNOTE =
  "Value is every asset you hold, cash included, converted to your base currency at today's rates and reduced to your share of any joint account. “Since you bought” is a lifetime figure from the whole history of each holding, not the period beside it. Cash has no cost basis, so it carries no profit or loss."

export const SHARE_BASIS_FOOTNOTE =
  "Share measures each holding against everything you hold, which is the same basis the composition bar splits. A balance you owe takes a negative share, so the column totals your net worth as a fraction of what you hold rather than 100%."

export const PERIOD_COLUMN_FOOTNOTE =
  "The period column is invented. It stands in for price movement only — money you added in the window belongs under Contributions — and it is a split of the Market bucket in “Why it moved”, so the two agree with each other rather than with your account."

export const PERIOD_COLUMN_UNAVAILABLE_FOOTNOTE =
  "The period column is blank. There is no window change to split across these holdings, so nothing has been invented for it."

export const ATTRIBUTION_BASIS_NOTE =
  "Net change is the real move in your portfolio's value over this window, read from the same valuations the chart draws. Only its split across the four buckets is invented."

export const NO_WINDOW_CHANGE_NOTE =
  "There is no valuation history for this window yet, so there is nothing to split into what you paid in and what your holdings earned."

export const LIFETIME_ONLY_NOTE =
  "Cost basis, profit and fees are lifetime figures — Sverto cannot narrow them to this window."

export const LOTS_FOOTNOTE =
  "Sales close the oldest lot first within each account. Lots from different accounts are listed together in date order — that is not one cross-account queue, and the realised gain on each lot was fixed by its own account's ordering. Realised gain is fixed at the moment of sale; unrealised moves with the price."

export const LOTS_CLOSED_NOTE =
  "Closed lots stay listed. Their realised figures are still true, so they keep their colour; only the row is dimmed."

export const CASH_IN_TOTAL_NOTE =
  "Cash sits in the total above but not in the profit columns."

export const EMPTY_HEADLINE = "Nothing in the portfolio yet"

export const EMPTY_BODY =
  "Once an account holds an asset or a balance, it appears here with its value, its share of the whole and what it has done since you bought it."

export const EMPTY_FOOTNOTE =
  "Values come from your accounts' holdings converted to your base currency. Nothing is estimated."

export const ASSET_EMPTY_HEADLINE = "You do not hold this asset"

export const ASSET_EMPTY_BODY =
  "There are no purchase lots for this asset in any of your accounts, so there is no cost basis, no profit and no price history to draw against."

export function ratelessNote(count: number): string {
  const holdings = count === 1 ? "holding has" : "holdings have"
  return `${String(count)} ${holdings} no rate path to your base currency, so every total on this page is short by that much. Nothing here estimates the missing value.`
}

export function pricesAsOfLabel(stamp: string): string {
  return `Prices as of ${stamp}`
}

export const STALE_PRICES_HEADLINE = "These prices are old"

export const STALE_PRICES_BODY =
  "The market values below were last priced some time ago, so the value, the share and the unrealised profit are all out of date by the same amount."

export const PRICES_AS_OF_NOTE =
  "Sverto does not record exactly when these prices were read, so this age is invented rather than measured."

export const CURRENCY_LENS_NOTE =
  "Cash is split by the currency it is held in. Sverto never says which currency each non-cash holding is priced in, so those sit in one segment instead of being guessed at."

export const FIFO_SCOPE_NOTE = "first-in-first-out within each account"
