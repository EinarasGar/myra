import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import type {
  AccountIdentifier,
  AccountType,
  GetAccountResponse,
  GetAccountsResponse,
} from "@/api"
import { AccountsApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { AccountClass } from "@/lib/domain/accounts"
import {
  ACCOUNT_CLASS_LABELS,
  ACCOUNT_CLASS_ORDER,
  classifyAccountType,
  compareAccountClasses,
  isJointAccount,
  isLiabilityClass,
  isLiquidAccountType,
  ownershipSharePercent,
} from "@/lib/domain/accounts"
import type { AssetRef, AssetRefIndex } from "@/lib/domain/refs"
import { indexAssets } from "@/lib/domain/refs"
import { apiQueryOptions, queryKeys, STALE_TIMES } from "@/lib/query"

/**
 * `GET /accounts` returns ACTIVE accounts only and the row has no `active` field
 * (account_queries.rs:85-90), so a deactivated account is invisible here. Its
 * holdings are NOT filtered out of `/portfolio/holdings`, which is why
 * `AccountBalancesView.unmatchedValue` exists.
 */
export interface AccountSummary {
  accountId: string
  name: string
  accountTypeId: number
  /** `null` when the response's lookup table omitted the type. Render an em dash. */
  accountTypeName: string | null
  accountClass: AccountClass
  isLiquid: boolean
  isLiability: boolean
  liquidityTypeId: number
  liquidityTypeName: string | null
  /** Fraction, `0 < share <= 1`. */
  ownershipShare: number
  ownershipSharePercent: number
  isJoint: boolean
  suggestedCurrencyAssetId: number | null
  suggestedCurrency: AssetRef | null
}

export interface AccountClassGroup {
  accountClass: AccountClass
  label: string
  accounts: AccountSummary[]
}

export interface AccountTypeOption {
  id: number
  name: string
  accountClass: AccountClass
  isLiquid: boolean
  isLiability: boolean
}

export interface AccountsView {
  accounts: AccountSummary[]
  byId: Record<string, AccountSummary | undefined>
  /** Every class in render order, including empty ones. Liabilities last. */
  groups: AccountClassGroup[]
  count: number
  jointCount: number
  accountTypes: AccountTypeOption[]
  liquidityTypes: AccountType[]
  assetsById: AssetRefIndex
}

export function toAccountTypeOption(type: AccountType): AccountTypeOption {
  const accountClass = classifyAccountType(type)
  return {
    id: type.id,
    name: type.name,
    accountClass,
    isLiquid: isLiquidAccountType(type),
    isLiability: isLiabilityClass(accountClass),
  }
}

export function compareAccounts(a: AccountSummary, b: AccountSummary): number {
  const byClass = compareAccountClasses(a.accountClass, b.accountClass)
  return byClass === 0 ? a.name.localeCompare(b.name) : byClass
}

export function buildAccountsView(response: GetAccountsResponse): AccountsView {
  const assetsById = indexAssets(response.lookup_tables.assets)
  const typesById = new Map(
    response.lookup_tables.account_types.map((type) => [type.id, type])
  )
  const liquidityById = new Map(
    response.lookup_tables.account_liquidity_types.map((type) => [
      type.id,
      type,
    ])
  )

  const accounts = response.accounts
    .map((row): AccountSummary => {
      const type = typesById.get(row.account_type) ?? { id: row.account_type }
      const accountClass = classifyAccountType(type)
      return {
        accountId: row.account_id,
        name: row.name,
        accountTypeId: row.account_type,
        accountTypeName: typesById.get(row.account_type)?.name ?? null,
        accountClass,
        isLiquid: isLiquidAccountType(type),
        isLiability: isLiabilityClass(accountClass),
        liquidityTypeId: row.liquidity_type,
        liquidityTypeName: liquidityById.get(row.liquidity_type)?.name ?? null,
        ownershipShare: row.ownership_share,
        ownershipSharePercent: ownershipSharePercent(row.ownership_share),
        isJoint: isJointAccount(row.ownership_share),
        suggestedCurrencyAssetId: row.suggested_currency,
        suggestedCurrency:
          row.suggested_currency === null
            ? null
            : (assetsById[row.suggested_currency] ?? null),
      }
    })
    .sort(compareAccounts)

  const byId: Record<string, AccountSummary | undefined> = {}
  for (const account of accounts) byId[account.accountId] = account

  return {
    accounts,
    byId,
    groups: ACCOUNT_CLASS_ORDER.map((accountClass) => ({
      accountClass,
      label: ACCOUNT_CLASS_LABELS[accountClass],
      accounts: accounts.filter(
        (account) => account.accountClass === accountClass
      ),
    })),
    count: accounts.length,
    jointCount: accounts.filter((account) => account.isJoint).length,
    accountTypes: response.lookup_tables.account_types.map(toAccountTypeOption),
    liquidityTypes: response.lookup_tables.account_liquidity_types,
    assetsById,
  }
}

export function accountsQueryOptions(userId: string) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).accounts.list(),
    staleTime: STALE_TIMES.standard,
    fetch: async ({ signal }): Promise<AccountsView> => {
      const response = await api(AccountsApiFactory).getAccounts(userId, {
        signal,
      })
      return buildAccountsView(response.data)
    },
    meta: { errorContext: "Accounts could not be loaded" },
  })
}

export function useAccounts(userId: string) {
  return useQuery(accountsQueryOptions(userId))
}

export function useAccountsSuspense(userId: string): AccountsView {
  return useSuspenseQuery(accountsQueryOptions(userId)).data
}

export interface AccountDetail {
  accountId: string
  name: string
  accountTypeId: number
  accountTypeName: string
  accountClass: AccountClass
  isLiquid: boolean
  isLiability: boolean
  liquidityTypeId: number
  liquidityTypeName: string
  ownershipShare: number
  ownershipSharePercent: number
  isJoint: boolean
  identifiers: AccountIdentifier[]
}

export function buildAccountDetail(
  response: GetAccountResponse,
  accountId: string
): AccountDetail {
  const accountClass = classifyAccountType(response.account_type)
  return {
    accountId,
    name: response.name,
    accountTypeId: response.account_type.id,
    accountTypeName: response.account_type.name,
    accountClass,
    isLiquid: isLiquidAccountType(response.account_type),
    isLiability: isLiabilityClass(accountClass),
    liquidityTypeId: response.liquidity_type.id,
    liquidityTypeName: response.liquidity_type.name,
    ownershipShare: response.ownership_share,
    ownershipSharePercent: ownershipSharePercent(response.ownership_share),
    isJoint: isJointAccount(response.ownership_share),
    identifiers: response.identifiers ?? [],
  }
}

export interface AccountQueryParams {
  userId: string
  accountId: string
}

export function accountQueryOptions({ userId, accountId }: AccountQueryParams) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).accounts.detail(accountId),
    staleTime: STALE_TIMES.standard,
    fetch: async ({ signal }): Promise<AccountDetail> => {
      const response = await api(AccountsApiFactory).getAccount(
        accountId,
        userId,
        { signal }
      )
      return buildAccountDetail(response.data, accountId)
    },
    meta: { errorContext: "Account could not be loaded" },
  })
}

export function useAccount(params: AccountQueryParams) {
  return useQuery(accountQueryOptions(params))
}

export function useAccountSuspense(params: AccountQueryParams): AccountDetail {
  return useSuspenseQuery(accountQueryOptions(params)).data
}

export function accountTypesQueryOptions() {
  return apiQueryOptions({
    queryKey: queryKeys.reference.accountTypes(),
    staleTime: STALE_TIMES.reference,
    fetch: async ({ signal }): Promise<AccountTypeOption[]> => {
      const response = await api(AccountsApiFactory).getAccountTypes({ signal })
      return response.data.account_types.map(toAccountTypeOption)
    },
    meta: { errorContext: "Account types could not be loaded" },
  })
}

export function useAccountTypes() {
  return useQuery(accountTypesQueryOptions())
}

export function useAccountTypesSuspense(): AccountTypeOption[] {
  return useSuspenseQuery(accountTypesQueryOptions()).data
}

/**
 * One row is seeded ("Liquid"), so this cannot separate liquid from illiquid — it
 * exists only because create/update require the id. Liquidity comes from
 * `AccountSummary.isLiquid`.
 */
export function accountLiquidityTypesQueryOptions() {
  return apiQueryOptions({
    queryKey: queryKeys.reference.accountLiquidityTypes(),
    staleTime: STALE_TIMES.reference,
    fetch: async ({ signal }): Promise<AccountType[]> => {
      const response = await api(AccountsApiFactory).getAccountLiquidityTypes({
        signal,
      })
      return response.data.account_liquidity_types
    },
    meta: { errorContext: "Account liquidity types could not be loaded" },
  })
}

export function useAccountLiquidityTypes() {
  return useQuery(accountLiquidityTypesQueryOptions())
}

export function useAccountLiquidityTypesSuspense(): AccountType[] {
  return useSuspenseQuery(accountLiquidityTypesQueryOptions()).data
}
