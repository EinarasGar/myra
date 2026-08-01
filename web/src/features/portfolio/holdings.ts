import type {
  AssetHolding,
  AssetPosition,
  HoldingsView,
  PortfolioOverviewView,
} from "@/features/portfolio/api"
import { countOf } from "@/lib/format"
import type { AccountRef, AssetRef } from "@/lib/domain/refs"
import {
  accountLabel,
  assetDisplayName,
  assetLabel,
  isCurrencyAsset,
} from "@/lib/domain/refs"

export interface HoldingAccountRow {
  key: string
  accountId: string
  account: AccountRef | null
  label: string
  units: number
  value: number | null
  position: AssetPosition | null
}

export interface PortfolioHoldingRow {
  key: string
  assetId: number
  asset: AssetRef | null
  label: string
  subLabel: string | null
  ticker: string
  isCash: boolean
  units: number
  value: number
  /** Against `holdingsShareBasis`, never net worth. Negative for a balance you owe. */
  share: number
  ratelessCount: number
  accounts: HoldingAccountRow[]
  /** `null` for cash and for anything the overview has no cost basis for. */
  lifetime: AssetHolding | null
}

function subLabelOf(asset: AssetRef | null, accountCount: number): string {
  const account = countOf(accountCount, "account")
  if (asset === null) return account
  const name = assetDisplayName(asset)
  if (name === assetLabel(asset)) return account
  return `${name} · ${account}`
}

/**
 * Net worth is the wrong denominator for a share: a mortgage's negative cash shrinks it
 * below the assets it sits beside, which is how a single holding reaches 104% of the
 * "portfolio". `AllocationBar` already draws its legend against the positive segments, so
 * measuring both against the same basis is what keeps the legend and the table agreeing.
 */
export function holdingsShareBasis(holdings: HoldingsView): number {
  return holdings.byAsset.reduce(
    (total, entry) => (entry.value > 0 ? total + entry.value : total),
    0
  )
}

/**
 * Holdings carry cash and rateless rows; the overview carries cost basis and gains
 * and drops cash entirely. Rows come from holdings so nothing a user owns is missing,
 * and the lifetime half is attached where the overview has one.
 */
export function buildHoldingRows(
  holdings: HoldingsView,
  overview: PortfolioOverviewView
): PortfolioHoldingRow[] {
  const total = holdingsShareBasis(holdings)

  return holdings.byAsset.map((entry) => {
    const asset = entry.asset
    const positionsByAccount = new Map(
      (overview.assetsById[entry.assetId]?.positions ?? []).map((position) => [
        position.accountId,
        position,
      ])
    )

    const accounts: HoldingAccountRow[] = [...entry.holdings]
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .map((holding) => ({
        key: `${String(entry.assetId)}:${holding.accountId}`,
        accountId: holding.accountId,
        account: holding.account,
        label:
          holding.account === null
            ? "Unknown account"
            : accountLabel(holding.account),
        units: holding.units,
        value: holding.value,
        position: positionsByAccount.get(holding.accountId) ?? null,
      }))

    return {
      key: String(entry.assetId),
      assetId: entry.assetId,
      asset,
      label:
        asset === null ? `Asset ${String(entry.assetId)}` : assetLabel(asset),
      subLabel: subLabelOf(asset, entry.accountCount),
      ticker: asset === null ? String(entry.assetId) : assetLabel(asset),
      isCash: asset !== null && isCurrencyAsset(asset),
      units: entry.units,
      value: entry.value,
      share: total === 0 ? 0 : entry.value / total,
      ratelessCount: entry.ratelessCount,
      accounts,
      lifetime: overview.assetsById[entry.assetId] ?? null,
    }
  })
}

export interface HoldingsSummary {
  rows: PortfolioHoldingRow[]
  totalValue: number
  /** Denominator of every share in the table and every slice in the composition bar. */
  shareBasis: number
  /** A share column that cannot total 100%, because something here is owed. */
  hasNegativeRow: boolean
  totalGains: number | null
  assetCount: number
  accountCount: number
  ratelessCount: number
  cashValue: number
  pricedValue: number
}

export function summariseHoldings(
  rows: readonly PortfolioHoldingRow[],
  holdings: HoldingsView,
  overview: PortfolioOverviewView
): HoldingsSummary {
  const accountIds = new Set<string>()
  let cashValue = 0
  for (const row of rows) {
    for (const account of row.accounts) accountIds.add(account.accountId)
    if (row.isCash) cashValue += row.value
  }

  return {
    rows: [...rows],
    totalValue: holdings.totalValue,
    shareBasis: holdingsShareBasis(holdings),
    hasNegativeRow: rows.some((row) => row.value < 0),
    totalGains: rows.some((row) => row.lifetime !== null)
      ? overview.totals.totalGains
      : null,
    assetCount: rows.length,
    accountCount: accountIds.size,
    ratelessCount: holdings.ratelessCount,
    cashValue,
    pricedValue: overview.totals.marketValue,
  }
}

export interface LotSummary {
  lotCount: number
  heldSince: number | null
  averageUnitCost: number | null
  realisedGains: number
  totalFees: number
}

export function lotSummaryOf(holding: AssetHolding): LotSummary {
  return {
    lotCount: holding.lots.length,
    heldSince: holding.heldSince,
    averageUnitCost: holding.averageUnitCost,
    realisedGains: holding.realisedGains,
    totalFees: holding.totalFees,
  }
}
