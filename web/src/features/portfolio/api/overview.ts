import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import type {
  AssetPortfolio,
  AssetPortfolioPosition,
  GetPortfolioOverview,
} from "@/api"
import { AccountPortfolioApiFactory, PortfolioApiFactory } from "@/api"
import { decimal } from "@/lib/domain/decimals"
import { api } from "@/lib/api"
import type { AccountRef, AssetRef } from "@/lib/domain/refs"
import { apiQueryOptions, queryKeys, STALE_TIMES } from "@/lib/query"

import type { PortfolioLookups } from "./refs"
import { toPortfolioLookups } from "./refs"

/**
 * The backend runs one FIFO ledger per (asset, account) pair, so sales close the
 * oldest lot WITHIN an account. Merged lot tables are ordered by date only — never
 * present them as a cross-account FIFO.
 */
export type FifoScope = "per-account"

export const FIFO_SCOPE: FifoScope = "per-account"

export type PortfolioScope =
  | { kind: "portfolio" }
  | { kind: "account"; accountId: string }
  | { kind: "asset"; assetId: number }

export interface PortfolioLot {
  accountId: string
  assetId: number
  /** Epoch MILLISECONDS. The API sends RFC3339 here and unix seconds elsewhere. */
  addedAt: number
  addPrice: number
  unitsAdded: number
  unitsSold: number
  unitsRemaining: number
  saleProceeds: number
  fees: number
  isDividend: boolean
  isClosed: boolean
  unitCostBasis: number
  totalCostBasis: number
  realisedGains: number
  unrealisedGains: number
  totalGains: number
  /**
   * Derived, because the API does not return it. `null` on a closed lot (the design
   * prints an em dash there) and when the cost basis is zero.
   */
  returnRatio: number | null
}

export interface AssetPosition {
  assetId: number
  accountId: string
  asset: AssetRef | null
  account: AccountRef | null
  unitsAdded: number
  unitsRemaining: number
  marketValue: number
  totalCostBasis: number
  /**
   * Derived as `totalCostBasis / unitsAdded`. The API's own `unit_cost_basis` is the
   * SUM of the per-lot unit costs, not an average, so it is deliberately not surfaced.
   */
  averageUnitCost: number | null
  realisedGains: number
  unrealisedGains: number
  totalGains: number
  totalFees: number
  cashDividends: number
  returnRatio: number | null
  lots: PortfolioLot[]
  openLotCount: number
  closedLotCount: number
  dividendLotCount: number
  /** Lots that have sold units. A lower bound on the sale count, which the API omits. */
  lotsWithSalesCount: number
  heldSince: number | null
}

export interface AssetHolding {
  assetId: number
  asset: AssetRef | null
  positions: AssetPosition[]
  accountCount: number
  unitsRemaining: number
  marketValue: number
  totalCostBasis: number
  averageUnitCost: number | null
  realisedGains: number
  unrealisedGains: number
  totalGains: number
  totalFees: number
  cashDividends: number
  returnRatio: number | null
  heldSince: number | null
  /**
   * Fraction of the scope's market value, not a percentage. Always `null` in an
   * asset-scoped view: the backend has already dropped every other asset, so a share
   * computed there would be 1 for any holding. Read it from the portfolio-scoped view.
   */
  allocationShare: number | null
  /** Every lot across the scope's accounts, ordered by date. See `FifoScope`. */
  lots: PortfolioLot[]
  fifoScope: FifoScope
}

export interface CashPosition {
  assetId: number
  accountId: string
  asset: AssetRef | null
  account: AccountRef | null
  units: number
  fees: number
  dividends: number
}

export interface PortfolioTotals {
  /** Assets only. Cash positions carry no value here — use holdings for net worth. */
  marketValue: number
  totalCostBasis: number
  realisedGains: number
  unrealisedGains: number
  totalGains: number
  totalFees: number
  cashDividends: number
  returnRatio: number | null
}

export interface PortfolioOverviewView {
  scope: PortfolioScope
  assets: AssetHolding[]
  assetsById: Record<number, AssetHolding | undefined>
  positions: AssetPosition[]
  /**
   * An asset-scoped response still carries the accounts' own cash rows — the backend
   * filters the asset portfolios only — so they are unrelated to the scoped asset.
   */
  cash: CashPosition[]
  totals: PortfolioTotals
  assetCount: number
  /** Accounts holding the scope. Asset scope ignores cash-only accounts. */
  accountCount: number
  /** `null` in an asset-scoped view, for the reason on `AssetHolding.allocationShare`. */
  largestAllocationShare: number | null
  /**
   * `GET /portfolio/overview` and the per-asset overview apply the account's
   * ownership share; `GET /accounts/{id}/portfolio/overview` deliberately does not
   * (portfolio_overview_service.rs:66-69), so an account's own page shows the full
   * account while the dashboard shows the user's share.
   */
  appliesOwnershipShare: boolean
  fifoScope: FifoScope
  /** LIFETIME figures only. Period columns and attribution need backend work. */
  isLifetimeOnly: true
  lookups: PortfolioLookups
}

function ratio(gains: number, costBasis: number): number | null {
  return costBasis === 0 ? null : gains / costBasis
}

function toLot(
  position: AssetPortfolioPosition,
  assetId: number,
  accountId: string
): PortfolioLot {
  const unitsRemaining = decimal(position.amount_left)
  const isClosed = unitsRemaining === 0
  const totalCostBasis = decimal(position.total_cost_basis)
  const totalGains = decimal(position.total_gains)
  return {
    accountId,
    assetId,
    addedAt: new Date(position.add_date).getTime(),
    addPrice: decimal(position.add_price),
    unitsAdded: decimal(position.quantity_added),
    unitsSold: decimal(position.amount_sold),
    unitsRemaining,
    saleProceeds: decimal(position.sale_proceeds),
    fees: decimal(position.fees),
    isDividend: position.is_dividend,
    isClosed,
    unitCostBasis: decimal(position.unit_cost_basis),
    totalCostBasis,
    realisedGains: decimal(position.realized_gains),
    unrealisedGains: decimal(position.unrealized_gains),
    totalGains,
    returnRatio: isClosed ? null : ratio(totalGains, totalCostBasis),
  }
}

function toPosition(
  row: AssetPortfolio,
  lookups: PortfolioLookups
): AssetPosition {
  const lots = row.positions
    .map((position) => toLot(position, row.asset_id, row.account_id))
    .sort((a, b) => a.addedAt - b.addedAt)

  const heldSince = lots[0]?.addedAt ?? null
  const totalUnits = decimal(row.total_units)
  const totalCostBasis = decimal(row.total_cost_basis)
  const totalGains = decimal(row.total_gains)

  return {
    assetId: row.asset_id,
    accountId: row.account_id,
    asset: lookups.assetsById[row.asset_id] ?? null,
    account: lookups.accountsById[row.account_id] ?? null,
    unitsAdded: totalUnits,
    unitsRemaining: decimal(row.remaining_units),
    marketValue: decimal(row.market_value),
    totalCostBasis,
    averageUnitCost: totalUnits === 0 ? null : totalCostBasis / totalUnits,
    realisedGains: decimal(row.realized_gains),
    unrealisedGains: decimal(row.unrealized_gains),
    totalGains,
    totalFees: decimal(row.total_fees),
    cashDividends: decimal(row.cash_dividends),
    returnRatio: ratio(totalGains, totalCostBasis),
    lots,
    openLotCount: lots.filter((lot) => !lot.isClosed).length,
    closedLotCount: lots.filter((lot) => lot.isClosed).length,
    dividendLotCount: lots.filter((lot) => lot.isDividend).length,
    lotsWithSalesCount: lots.filter((lot) => lot.unitsSold > 0).length,
    heldSince,
  }
}

function groupByAsset(positions: AssetPosition[]): AssetHolding[] {
  const byAsset = new Map<number, AssetPosition[]>()
  for (const position of positions) {
    const group = byAsset.get(position.assetId)
    if (group) group.push(position)
    else byAsset.set(position.assetId, [position])
  }

  const holdings: AssetHolding[] = []
  for (const [assetId, group] of byAsset) {
    const sum = (pick: (position: AssetPosition) => number): number =>
      group.reduce((total, position) => total + pick(position), 0)

    const unitsAdded = sum((position) => position.unitsAdded)
    const totalCostBasis = sum((position) => position.totalCostBasis)
    const totalGains = sum((position) => position.totalGains)
    const lots = group
      .flatMap((position) => position.lots)
      .sort((a, b) => a.addedAt - b.addedAt)
    const heldSince = lots[0]?.addedAt ?? null

    holdings.push({
      assetId,
      asset: group[0]?.asset ?? null,
      positions: [...group].sort((a, b) => b.marketValue - a.marketValue),
      accountCount: new Set(group.map((position) => position.accountId)).size,
      unitsRemaining: sum((position) => position.unitsRemaining),
      marketValue: sum((position) => position.marketValue),
      totalCostBasis,
      averageUnitCost: unitsAdded === 0 ? null : totalCostBasis / unitsAdded,
      realisedGains: sum((position) => position.realisedGains),
      unrealisedGains: sum((position) => position.unrealisedGains),
      totalGains,
      totalFees: sum((position) => position.totalFees),
      cashDividends: sum((position) => position.cashDividends),
      returnRatio: ratio(totalGains, totalCostBasis),
      heldSince,
      allocationShare: null,
      lots,
      fifoScope: FIFO_SCOPE,
    })
  }

  return holdings.sort((a, b) => b.marketValue - a.marketValue)
}

export function buildPortfolioOverviewView(
  response: GetPortfolioOverview,
  scope: PortfolioScope
): PortfolioOverviewView {
  const lookups = toPortfolioLookups(response.lookup_tables)

  const positions = response.portfolios.asset_portfolios
    .map((row) => toPosition(row, lookups))
    .sort((a, b) => b.marketValue - a.marketValue)

  const cash: CashPosition[] = response.portfolios.cash_portfolios
    .map((row) => ({
      assetId: row.asset_id,
      accountId: row.account_id,
      asset: lookups.assetsById[row.asset_id] ?? null,
      account: lookups.accountsById[row.account_id] ?? null,
      units: decimal(row.units),
      fees: decimal(row.fees),
      dividends: decimal(row.dividends),
    }))
    .sort((a, b) => b.units - a.units)

  const assets = groupByAsset(positions)
  const sum = (pick: (position: AssetPosition) => number): number =>
    positions.reduce((total, position) => total + pick(position), 0)

  const marketValue = sum((position) => position.marketValue)
  const totalCostBasis = sum((position) => position.totalCostBasis)
  const totalGains = sum((position) => position.totalGains)

  const isAssetScope = scope.kind === "asset"

  const assetsById: Record<number, AssetHolding | undefined> = {}
  for (const asset of assets) {
    asset.allocationShare =
      isAssetScope || marketValue === 0 ? null : asset.marketValue / marketValue
    assetsById[asset.assetId] = asset
  }

  const accountIds = new Set<string>([
    ...positions.map((position) => position.accountId),
    ...(isAssetScope ? [] : cash.map((position) => position.accountId)),
  ])

  return {
    scope,
    assets,
    assetsById,
    positions,
    cash,
    totals: {
      marketValue,
      totalCostBasis,
      realisedGains: sum((position) => position.realisedGains),
      unrealisedGains: sum((position) => position.unrealisedGains),
      totalGains,
      totalFees: sum((position) => position.totalFees),
      cashDividends: sum((position) => position.cashDividends),
      returnRatio: ratio(totalGains, totalCostBasis),
    },
    assetCount: assets.length,
    accountCount: accountIds.size,
    largestAllocationShare: assets[0]?.allocationShare ?? null,
    appliesOwnershipShare: scope.kind !== "account",
    fifoScope: FIFO_SCOPE,
    isLifetimeOnly: true,
    lookups,
  }
}

export interface PortfolioOverviewQueryParams {
  userId: string
  defaultAssetId: number
}

export function portfolioOverviewQueryOptions({
  userId,
  defaultAssetId,
}: PortfolioOverviewQueryParams) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).portfolio.overview({ defaultAssetId }),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<PortfolioOverviewView> => {
      const response = await api(PortfolioApiFactory).getPortfolioOverview(
        userId,
        defaultAssetId,
        { signal }
      )
      return buildPortfolioOverviewView(response.data, { kind: "portfolio" })
    },
    meta: { errorContext: "Portfolio could not be loaded" },
  })
}

export function usePortfolioOverview(params: PortfolioOverviewQueryParams) {
  return useQuery(portfolioOverviewQueryOptions(params))
}

export function usePortfolioOverviewSuspense(
  params: PortfolioOverviewQueryParams
): PortfolioOverviewView {
  return useSuspenseQuery(portfolioOverviewQueryOptions(params)).data
}

export interface AssetOverviewQueryParams extends PortfolioOverviewQueryParams {
  assetId: number
}

export function assetOverviewQueryOptions({
  userId,
  assetId,
  defaultAssetId,
}: AssetOverviewQueryParams) {
  return apiQueryOptions({
    queryKey: queryKeys
      .user(userId)
      .portfolio.assetOverview(assetId, { defaultAssetId }),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<PortfolioOverviewView> => {
      const response = await api(PortfolioApiFactory).getPortfolioAssetOverview(
        userId,
        assetId,
        defaultAssetId,
        { signal }
      )
      return buildPortfolioOverviewView(response.data, {
        kind: "asset",
        assetId,
      })
    },
    meta: { errorContext: "Asset could not be loaded" },
  })
}

export function useAssetOverview(params: AssetOverviewQueryParams) {
  return useQuery(assetOverviewQueryOptions(params))
}

export function useAssetOverviewSuspense(
  params: AssetOverviewQueryParams
): PortfolioOverviewView {
  return useSuspenseQuery(assetOverviewQueryOptions(params)).data
}

/**
 * The one asset a per-asset overview is about, or `null` when nothing is held (and
 * always `null` for a portfolio- or account-scoped view, which has many assets).
 */
export function assetHoldingOf(
  view: PortfolioOverviewView
): AssetHolding | null {
  if (view.scope.kind !== "asset") return null
  return view.assetsById[view.scope.assetId] ?? null
}

export interface AccountPortfolioOverviewQueryParams extends PortfolioOverviewQueryParams {
  accountId: string
}

export function accountPortfolioOverviewQueryOptions({
  userId,
  accountId,
  defaultAssetId,
}: AccountPortfolioOverviewQueryParams) {
  return apiQueryOptions({
    queryKey: queryKeys
      .user(userId)
      .accounts.portfolioOverview(accountId, { defaultAssetId }),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<PortfolioOverviewView> => {
      const response = await api(
        AccountPortfolioApiFactory
      ).getAccountPortfolioOverview(userId, accountId, defaultAssetId, {
        signal,
      })
      return buildPortfolioOverviewView(response.data, {
        kind: "account",
        accountId,
      })
    },
    meta: { errorContext: "Account portfolio could not be loaded" },
  })
}

export function useAccountPortfolioOverview(
  params: AccountPortfolioOverviewQueryParams
) {
  return useQuery(accountPortfolioOverviewQueryOptions(params))
}

export function useAccountPortfolioOverviewSuspense(
  params: AccountPortfolioOverviewQueryParams
): PortfolioOverviewView {
  return useSuspenseQuery(accountPortfolioOverviewQueryOptions(params)).data
}
