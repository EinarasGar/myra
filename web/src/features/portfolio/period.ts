import { useMemo } from "react"

import { CHART_PERIOD_TITLES, type ChartPeriod } from "@/components/chart"
import type { MockId } from "@/lib/mock"
import { mockHoldingPeriodChange } from "@/lib/mock"

import type { PortfolioHoldingRow } from "./holdings"

export const PERIOD_COLUMN_MOCK_ID: MockId = "portfolio.period-column"

export interface PeriodChange {
  amount: number
  ratio: number | null
}

export interface PeriodColumn {
  /** Column header, e.g. "Last month". */
  label: string
  byHolding: Record<string, PeriodChange | undefined>
  byAccount: Record<string, PeriodChange | undefined>
  /** `null` when there is no market figure to split, in which case the column is blank. */
  total: number | null
  mockId: MockId
}

/**
 * Per-account changes are the holding's change apportioned by value, which is the only
 * split that still adds up to the parent row and to the total beneath it.
 */
function apportion(
  row: PortfolioHoldingRow,
  change: PeriodChange
): [string, PeriodChange][] {
  return row.accounts.map((account) => {
    const share = row.value === 0 ? 0 : (account.value ?? 0) / row.value
    return [account.key, { amount: change.amount * share, ratio: change.ratio }]
  })
}

export function buildPeriodColumn(
  rows: readonly PortfolioHoldingRow[],
  period: ChartPeriod,
  marketTotal: number | null
): PeriodColumn {
  const label = CHART_PERIOD_TITLES[period]
  const shapes = rows.map((row) => ({
    row,
    shape: mockHoldingPeriodChange({
      ticker: row.ticker,
      marketValue: row.value,
      isCash: row.isCash,
    }).amount,
  }))
  const shapeTotal = shapes.reduce((sum, entry) => sum + entry.shape, 0)

  if (marketTotal === null || shapeTotal === 0) {
    return {
      label,
      byHolding: {},
      byAccount: {},
      total: null,
      mockId: PERIOD_COLUMN_MOCK_ID,
    }
  }

  const byHolding: Record<string, PeriodChange | undefined> = {}
  const byAccount: Record<string, PeriodChange | undefined> = {}
  const scale = marketTotal / shapeTotal

  for (const { row, shape } of shapes) {
    if (shape === 0 && !row.isCash) continue
    const amount = shape * scale
    const opening = row.value - amount
    const change: PeriodChange = {
      amount,
      ratio: row.isCash || opening === 0 ? null : amount / opening,
    }
    byHolding[row.key] = change
    for (const [key, split] of apportion(row, change)) byAccount[key] = split
  }

  return {
    label,
    byHolding,
    byAccount,
    total: marketTotal,
    mockId: PERIOD_COLUMN_MOCK_ID,
  }
}

export function usePeriodColumn(
  rows: readonly PortfolioHoldingRow[],
  period: ChartPeriod,
  marketTotal: number | null
): PeriodColumn {
  return useMemo(
    () => buildPeriodColumn(rows, period, marketTotal),
    [rows, period, marketTotal]
  )
}
