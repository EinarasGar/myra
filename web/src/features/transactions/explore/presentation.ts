import type { ShellWidth } from "@/components/layout/breakpoints"

import type { LedgerQueryPlan } from "../api"

export type LedgerBanding = "day" | "pivot"

export const LEDGER_COLUMNS: Record<
  LedgerBanding,
  Record<ShellWidth, string>
> = {
  day: {
    full: "26px 22px minmax(0,1fr) 108px 172px 128px 118px",
    tight: "26px 22px minmax(0,1fr) 172px 128px 118px",
    stacked: "20px 20px minmax(0,1fr) 116px",
    phone: "20px minmax(0,1fr) 104px",
  },
  pivot: {
    full: "24px 20px minmax(0,1fr) 58px 104px 164px 116px 112px",
    tight: "24px 20px minmax(0,1fr) 58px 164px 116px 112px",
    stacked: "20px 20px minmax(0,1fr) 116px",
    phone: "20px minmax(0,1fr) 104px",
  },
}

export const LEDGER_GAP: Record<LedgerBanding, Record<ShellWidth, number>> = {
  day: { full: 14, tight: 12, stacked: 12, phone: 10 },
  pivot: { full: 13, tight: 12, stacked: 12, phone: 10 },
}

export const LEDGER_PADDING: Record<ShellWidth, number> = {
  full: 18,
  tight: 15,
  stacked: 15,
  phone: 14,
}

export interface LedgerColumns {
  readonly banding: LedgerBanding
  readonly select: boolean
  readonly glyph: boolean
  readonly date: boolean
  readonly type: boolean
  readonly account: boolean
  readonly category: boolean
  readonly twoLine: boolean
}

const COLUMNS_BY_WIDTH: Record<
  LedgerBanding,
  Record<ShellWidth, Omit<LedgerColumns, "banding">>
> = {
  day: {
    full: {
      select: true,
      glyph: true,
      date: false,
      type: true,
      account: true,
      category: true,
      twoLine: false,
    },
    tight: {
      select: true,
      glyph: true,
      date: false,
      type: false,
      account: true,
      category: true,
      twoLine: false,
    },
    stacked: {
      select: true,
      glyph: true,
      date: false,
      type: false,
      account: false,
      category: false,
      twoLine: true,
    },
    phone: {
      select: false,
      glyph: true,
      date: false,
      type: false,
      account: false,
      category: false,
      twoLine: true,
    },
  },
  pivot: {
    full: {
      select: true,
      glyph: true,
      date: true,
      type: true,
      account: true,
      category: true,
      twoLine: false,
    },
    tight: {
      select: true,
      glyph: true,
      date: true,
      type: false,
      account: true,
      category: true,
      twoLine: false,
    },
    stacked: {
      select: true,
      glyph: true,
      date: false,
      type: false,
      account: false,
      category: false,
      twoLine: true,
    },
    phone: {
      select: false,
      glyph: true,
      date: false,
      type: false,
      account: false,
      category: false,
      twoLine: true,
    },
  },
}

export function ledgerBanding(mode: string): LedgerBanding {
  return mode === "day" ? "day" : "pivot"
}

export function ledgerColumns(
  width: ShellWidth,
  banding: LedgerBanding
): LedgerColumns {
  return { banding, ...COLUMNS_BY_WIDTH[banding][width] }
}

export function ledgerCellCount(columns: LedgerColumns): number {
  const optional = [
    columns.select,
    columns.glyph,
    columns.date,
    columns.type,
    columns.account,
    columns.category,
  ].filter(Boolean).length
  return optional + 2
}

export type LedgerRowSize = "table" | "compact" | "two-line"

export function ledgerRowSize(columns: LedgerColumns): LedgerRowSize {
  if (columns.twoLine) return "two-line"
  return columns.banding === "day" ? "table" : "compact"
}

export type LedgerChildSize = "child" | "child-compact"

export function ledgerChildSize(columns: LedgerColumns): LedgerChildSize {
  if (columns.twoLine) return "child"
  return columns.banding === "day" ? "child" : "child-compact"
}

export type LedgerEmptyState =
  "rows" | "no-data" | "unapplied-only" | "filtered"

/**
 * "Filtered" means a filter *ran*. Tokens the server cannot execute leave the request as the
 * whole unfiltered ledger, so an empty answer under them is an empty ledger, not a narrow one.
 */
export function ledgerEmptyState(
  isEmpty: boolean,
  plan: Pick<LedgerQueryPlan, "appliedTokens" | "unsupportedTokens">
): LedgerEmptyState {
  if (!isEmpty) return "rows"
  if (plan.appliedTokens.length > 0) return "filtered"
  return plan.unsupportedTokens.length > 0 ? "unapplied-only" : "no-data"
}

export const DAY_NET_FIGURE_LIMIT = 2
