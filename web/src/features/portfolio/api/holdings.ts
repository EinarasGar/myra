import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import type { GetHoldingsResponse } from "@/api"
import { PortfolioApiFactory } from "@/api"
import { decimal, decimalOrNull } from "@/lib/domain/decimals"
import { api } from "@/lib/api"
import type { AccountRef, AssetRef } from "@/lib/domain/refs"
import { apiQueryOptions, queryKeys, STALE_TIMES } from "@/lib/query"

import type { PortfolioLookups } from "./refs"
import { toPortfolioLookups } from "./refs"

/**
 * `apply_ownership_share` defaults to true server-side (portfolio_handler.rs:83) and
 * the generated client does not expose the parameter, so holdings are ALWAYS the
 * user's share. `GET /accounts/{id}/portfolio/overview` does the opposite — see
 * `appliesOwnershipShare` on the overview views.
 */
export const HOLDINGS_APPLY_OWNERSHIP_SHARE = true

export interface Holding {
  accountId: string
  assetId: number
  units: number
  /** `null` when no rate path reaches the base currency. Render the em dash, never 0. */
  value: number | null
  asset: AssetRef | null
  account: AccountRef | null
}

export interface AccountHoldings {
  accountId: string
  account: AccountRef | null
  value: number
  ratelessCount: number
  holdings: Holding[]
}

export interface AssetHoldings {
  assetId: number
  asset: AssetRef | null
  units: number
  value: number
  ratelessCount: number
  accountCount: number
  holdings: Holding[]
}

export interface HoldingsView {
  holdings: Holding[]
  byAccount: AccountHoldings[]
  byAccountId: Record<string, AccountHoldings | undefined>
  byAsset: AssetHoldings[]
  byAssetId: Record<number, AssetHoldings | undefined>
  /** Sum of the values that exist. Excludes rateless rows. */
  totalValue: number
  ratelessCount: number
  /** At least one holding has no value, so every total on this page is incomplete. */
  isDegraded: boolean
  appliesOwnershipShare: boolean
  lookups: PortfolioLookups
}

function byValueDesc(a: { value: number }, b: { value: number }): number {
  return b.value - a.value
}

export function buildHoldingsView(response: GetHoldingsResponse): HoldingsView {
  const lookups = toPortfolioLookups(response.lookup_tables)

  const holdings: Holding[] = response.holdings.map((row) => ({
    accountId: row.account_id,
    assetId: row.asset_id,
    units: decimal(row.units),
    value: decimalOrNull(row.value),
    asset: lookups.assetsById[row.asset_id] ?? null,
    account: lookups.accountsById[row.account_id] ?? null,
  }))

  const byAccountId: Record<string, AccountHoldings | undefined> = {}
  const byAssetId: Record<number, AssetHoldings | undefined> = {}
  let totalValue = 0
  let ratelessCount = 0

  for (const holding of holdings) {
    const rateless = holding.value === null
    const value = holding.value ?? 0
    if (rateless) ratelessCount += 1
    else totalValue += value

    const account = (byAccountId[holding.accountId] ??= {
      accountId: holding.accountId,
      account: holding.account,
      value: 0,
      ratelessCount: 0,
      holdings: [],
    })
    account.value += value
    account.ratelessCount += rateless ? 1 : 0
    account.holdings.push(holding)

    const asset = (byAssetId[holding.assetId] ??= {
      assetId: holding.assetId,
      asset: holding.asset,
      units: 0,
      value: 0,
      ratelessCount: 0,
      accountCount: 0,
      holdings: [],
    })
    asset.units += holding.units
    asset.value += value
    asset.ratelessCount += rateless ? 1 : 0
    asset.holdings.push(holding)
    asset.accountCount = asset.holdings.length
  }

  return {
    holdings,
    byAccount: Object.values(byAccountId)
      .filter((entry) => entry !== undefined)
      .sort(byValueDesc),
    byAccountId,
    byAsset: Object.values(byAssetId)
      .filter((entry) => entry !== undefined)
      .sort(byValueDesc),
    byAssetId,
    totalValue,
    ratelessCount,
    isDegraded: ratelessCount > 0,
    appliesOwnershipShare: HOLDINGS_APPLY_OWNERSHIP_SHARE,
    lookups,
  }
}

export interface HoldingsQueryParams {
  userId: string
  defaultAssetId: number
}

export function holdingsQueryOptions({
  userId,
  defaultAssetId,
}: HoldingsQueryParams) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).portfolio.holdings({
      defaultAssetId,
      applyOwnershipShare: HOLDINGS_APPLY_OWNERSHIP_SHARE,
    }),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<HoldingsView> => {
      const response = await api(PortfolioApiFactory).getHoldings(
        userId,
        defaultAssetId,
        { signal }
      )
      return buildHoldingsView(response.data)
    },
    meta: { errorContext: "Holdings could not be loaded" },
  })
}

export function useHoldings(params: HoldingsQueryParams) {
  return useQuery(holdingsQueryOptions(params))
}

export function useHoldingsSuspense(params: HoldingsQueryParams): HoldingsView {
  return useSuspenseQuery(holdingsQueryOptions(params)).data
}
