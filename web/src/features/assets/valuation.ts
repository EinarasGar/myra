import { formatDateStamp } from "@/lib/format"

export const VALUATION_STALE_DAYS = 90

const MS_PER_DAY = 86_400_000

function startOfDay(value: Date): number {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate()
  ).getTime()
}

export function daysSinceValuation(asOf: Date, now: Date): number {
  return Math.max(
    0,
    Math.round((startOfDay(now) - startOfDay(asOf)) / MS_PER_DAY)
  )
}

export function valuationAgeLabel(days: number): string {
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 60) return `${String(days)} days ago`
  const months = Math.round(days / 30)
  if (months < 24) return `${String(months)} months ago`
  return `${String(Math.round(days / 365))} years ago`
}

export function isStaleValuation(days: number): boolean {
  return days >= VALUATION_STALE_DAYS
}

export function lastValuedLine(asOf: Date, now: Date): string {
  const stamp = formatDateStamp(asOf, { year: "always", now })
  return `Last valued ${stamp} · ${valuationAgeLabel(daysSinceValuation(asOf, now))}`
}

export function staleValuationHeadline(asOf: Date, now: Date): string {
  return `This valuation was entered ${valuationAgeLabel(daysSinceValuation(asOf, now))}`
}

export function staleValuationBody(
  ticker: string,
  asOf: Date,
  now: Date
): string {
  const stamp = formatDateStamp(asOf, { year: "always", now })
  return `Sverto cannot price ${ticker} for you, so your net worth, this holding and every total that contains it still use the figure you entered on ${stamp}. Add a valuation to move them.`
}

export const VALUATION_NEVER_HEADLINE = "This asset has never been valued"

export function valuationNeverBody(ticker: string): string {
  return `${ticker} counts as nothing in every total until you enter a rate for it, including net worth and any holding you already have.`
}

export const VALUATION_FOOTNOTE =
  "Every figure here is one you typed. Sverto never fetches a rate for a custom asset, and it never interpolates between two of your valuations — a total on any date in between uses the last valuation before it."

export const ADD_VALUATION_LABEL = "Add a valuation"

export const VALUATION_ROWS_DRAWN = 8

/** A pension fund can carry a valuation a day, so the fold pages rather than unrolls. */
export const VALUATION_ROWS_PER_FOLD = 25

export function valuationFoldLabel(remaining: number): string {
  const next = Math.min(VALUATION_ROWS_PER_FOLD, remaining)
  if (next === remaining) return `Show the other ${String(remaining)} →`
  return `Show ${String(next)} more · ${String(remaining)} older →`
}

export function valuationHistoryEmptyBody(hasPeriodControl: boolean): string {
  return hasPeriodControl
    ? "No valuations in this window. Widen the period above the table, or add one."
    : "No valuations recorded against this pair yet. Add one and every total that holds this asset moves with it."
}

export const CUSTOM_ASSET_UNHELD_BODY =
  "You have not bought any of it, so there is no lot ledger and it adds nothing to your net worth. The valuations above still stand, ready for the day a transaction gives you units."

export const PAIR_NONE_HEADLINE = "No reference pair yet"

export const PAIR_NONE_BODY =
  "A valuation is always a rate against another asset. Pair this asset with the currency you think of it in, then enter what one unit is worth."

export function impliedChangeLine(
  next: number,
  previous: number | null
): string | null {
  if (previous === null || previous === 0) return null
  const ratio = next / previous - 1
  if (ratio === 0) return "No change on the last valuation."
  const direction = ratio > 0 ? "up" : "down"
  const percent = (Math.abs(ratio) * 100).toFixed(1)
  return `That is ${direction} ${percent}% on the last valuation.`
}
