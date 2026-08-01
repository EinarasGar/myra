import { countOf } from "@/lib/format"

import type { LedgerFilterKey, LedgerResult } from "../api"

import type { PivotResult } from "./pivot"

export const UNSUPPORTED_COPY: Record<LedgerFilterKey, string> = {
  text: "While an account filter is on, search terms are ignored, so this text is not narrowing anything. Remove the account to search again.",
  account:
    "Only one account can be filtered at a time; the extra account is not applied.",
  category:
    "Sverto cannot filter by category yet, and twelve of the thirteen transaction types carry no category at all.",
  type: "Sverto cannot filter by transaction type yet.",
  dateFrom:
    "Sverto cannot filter by date yet, so the rows below still cover the whole ledger.",
  dateTo:
    "Sverto cannot filter by date yet, so the rows below still cover the whole ledger.",
  amountMin: "Sverto cannot filter by amount yet.",
  amountMax: "Sverto cannot filter by amount yet.",
  visibility: "Sverto cannot filter by review status yet.",
}

export const QUERY_PLACEHOLDER =
  "Search descriptions, or type from:2026-07-01, to:…, type:purchase"

export const SLICE_SCOPE_NOTE =
  "Net is the signed sum of the currency entries and fees on the days below, which add up to it exactly. Nothing converts a transaction, so each currency is answered on its own."

export const SLICE_PARTIAL_NOTE =
  "These are the newest complete days loaded, not a window you picked — Sverto cannot yet narrow this view to a date range or total one. The oldest day loaded is still filling, so it sits outside this and its own band prints no total. Loading more extends both backwards."

export const SLICE_COMPLETE_NOTE =
  "Every transaction in this view is loaded, so this covers all of them."

export function sliceFootnote(excludesPartialDay: boolean): string {
  return `${SLICE_SCOPE_NOTE} ${excludesPartialDay ? SLICE_PARTIAL_NOTE : SLICE_COMPLETE_NOTE}`
}

export const CURRENCY_FOOTNOTE =
  "Every amount is in the asset its own entry is in. Sverto never converts a transaction to your base currency, so a day in two currencies shows two figures and nothing is ever added across them."

export const ACCOUNT_SOURCE_NOTE =
  "A single account is listed one transaction at a time: no groups appear and no category names come with them."

export const NO_CATEGORY_TITLE =
  "This transaction type does not carry a category — only everyday purchases do."

export const LEDGER_EMPTY_BODY =
  "Add one by hand, connect a bank so imports arrive on their own, or snap a receipt and Myra will read it."

export const FILTERED_EMPTY_BODY =
  "No transaction matches the filters that actually ran. Struck-through filters are not narrowing anything, so widening them will not bring rows back — clear the ones that are applied."

export const LEDGER_EMPTY_FOOTNOTE =
  "Nothing is hidden here: this view covers every transaction on your profile."

export const STALE_ROWS_STATUS =
  "Loading the rows that match your filters. The rows below are the previous result and do not match yet."

export const UNAPPLIED_ONLY_FOOTNOTE =
  "None of the filters in the bar above is narrowing anything, so clearing them would bring nothing back. This is the whole ledger, and it is empty."

export const PARTIAL_SHARE_NOTE =
  "Share bars stay hidden until every row is loaded. They rank the groups against the largest one, and the rows still to come can change which group that is."

export function ledgerScopeFootnote(
  ledger: Pick<LedgerResult, "hasNextPage" | "loadedCount" | "source">,
  pivot: Pick<PivotResult, "mode" | "note" | "shareNote">
): string {
  const scope = ledger.hasNextPage
    ? `Day nets and subtotals cover the ${countOf(ledger.loadedCount, "row")} loaded so far, not the whole ledger — load the rest to complete them. A band that folds a group counts its children, so band counts add up past the row count.`
    : "Every transaction in this view is loaded, so the nets and subtotals below are complete."

  const shares =
    pivot.mode !== "day" && ledger.hasNextPage
      ? PARTIAL_SHARE_NOTE
      : pivot.shareNote

  return [
    CURRENCY_FOOTNOTE,
    scope,
    ledger.source === "account" ? ACCOUNT_SOURCE_NOTE : null,
    pivot.note,
    shares,
  ]
    .filter((part): part is string => part !== null)
    .join(" ")
}
