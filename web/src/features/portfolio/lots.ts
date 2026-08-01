import type {
  AssetHolding,
  PortfolioLot,
  PortfolioOverviewView,
} from "@/features/portfolio/api"
import { accountLabel } from "@/lib/domain/refs"

export interface LotRow {
  key: string
  lot: PortfolioLot
  accountLabel: string
  /** Closed lots keep their realised figures in full colour; only the row is ghosted. */
  isClosed: boolean
}

export interface LotTotals {
  lotCount: number
  openCount: number
  closedCount: number
  unitsRemaining: number
  averageUnitCost: number | null
  totalCostBasis: number
  unrealisedGains: number
  realisedGains: number
  totalGains: number
  returnRatio: number | null
  totalFees: number
  lotsChargedFees: number
  lotsWithSales: number
  dividendLots: number
}

export function buildLotRows(
  holding: AssetHolding,
  overview: PortfolioOverviewView
): LotRow[] {
  return holding.lots.map((lot, index) => {
    const account = overview.lookups.accountsById[lot.accountId] ?? null
    return {
      key: `${lot.accountId}:${String(lot.addedAt)}:${String(index)}`,
      lot,
      accountLabel:
        account === null ? "Unknown account" : accountLabel(account),
      isClosed: lot.isClosed,
    }
  })
}

export function buildLotTotals(holding: AssetHolding): LotTotals {
  const lots = holding.lots
  return {
    lotCount: lots.length,
    openCount: lots.filter((lot) => !lot.isClosed).length,
    closedCount: lots.filter((lot) => lot.isClosed).length,
    unitsRemaining: holding.unitsRemaining,
    averageUnitCost: holding.averageUnitCost,
    totalCostBasis: holding.totalCostBasis,
    unrealisedGains: holding.unrealisedGains,
    realisedGains: holding.realisedGains,
    totalGains: holding.totalGains,
    returnRatio: holding.returnRatio,
    totalFees: holding.totalFees,
    lotsChargedFees: lots.filter((lot) => lot.fees > 0).length,
    lotsWithSales: lots.filter((lot) => lot.unitsSold > 0).length,
    dividendLots: lots.filter((lot) => lot.isDividend).length,
  }
}

export function ratioOf(gains: number, costBasis: number): number | null {
  return costBasis === 0 ? null : gains / costBasis
}

export function monthsHeld(heldSince: number | null, now: Date): number | null {
  if (heldSince === null) return null
  const start = new Date(heldSince)
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  return months < 0 ? null : months
}
