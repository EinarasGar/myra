import type {
  HoldingsView,
  PortfolioOverviewView,
} from "@/features/portfolio/api"
import type { AccountClass } from "@/lib/domain/accounts"

import type {
  AccountBalance,
  AccountBalancesView,
  AccountConnector,
  AccountConnectorsView,
} from "./api"

export const ACCOUNT_CLASS_SWATCH: Record<AccountClass, string> = {
  cash: "bg-chart-1",
  investments: "bg-chart-2",
  property: "bg-chart-3",
  other: "bg-chart-4",
  liabilities: "bg-negative",
}

export interface AccountIndexRow extends AccountBalance {
  connector: AccountConnector | null
  /** `null` when the account holds no priced asset position, not when the gain is zero. */
  unrealisedGains: number | null
}

export interface AccountIndexGroup {
  accountClass: AccountClass
  label: string
  swatch: string
  accounts: AccountIndexRow[]
  subtotal: number
  ratelessCount: number
}

export interface UnlistedAccount {
  accountId: string
  value: number
  holdingCount: number
}

export interface AccountIndexView {
  groups: AccountIndexGroup[]
  rows: AccountIndexRow[]
  count: number
  jointCount: number
  connectedCount: number
  needsAttentionCount: number
}

function unrealisedByAccount(
  overview: PortfolioOverviewView
): Record<string, number | undefined> {
  const totals: Record<string, number | undefined> = {}
  for (const position of overview.positions) {
    totals[position.accountId] =
      (totals[position.accountId] ?? 0) + position.unrealisedGains
  }
  return totals
}

export function buildAccountIndex(
  balances: AccountBalancesView,
  overview: PortfolioOverviewView,
  connectors: AccountConnectorsView
): AccountIndexView {
  const gains = unrealisedByAccount(overview)

  const toRow = (account: AccountBalance): AccountIndexRow => ({
    ...account,
    connector: connectors.byAccountId[account.accountId] ?? null,
    unrealisedGains: gains[account.accountId] ?? null,
  })

  const groups = balances.groups
    .filter((group) => group.accounts.length > 0)
    .map((group): AccountIndexGroup => ({
      accountClass: group.accountClass,
      label: group.label,
      swatch: ACCOUNT_CLASS_SWATCH[group.accountClass],
      accounts: group.accounts.map(toRow),
      subtotal: group.subtotal,
      ratelessCount: group.ratelessCount,
    }))

  const rows = groups.flatMap((group) => group.accounts)

  return {
    groups,
    rows,
    count: rows.length,
    jointCount: rows.filter((row) => row.isJoint).length,
    connectedCount: rows.filter((row) => row.connector !== null).length,
    needsAttentionCount: rows.filter(
      (row) => row.connector?.statusWord === "needsAttention"
    ).length,
  }
}

/**
 * Holdings that sit on an account `GET /accounts` did not return. Deactivating an
 * account hides it from the list but keeps its holdings, so this is the only evidence
 * a deactivated account exists — and a lower bound, because one with no holdings
 * leaves no trace at all. The account lookup tables filter to active accounts too, so
 * these carry an id and a value but never a name.
 */
export function unlistedAccounts(
  balances: AccountBalancesView,
  holdings: HoldingsView
): UnlistedAccount[] {
  return balances.unmatchedAccountIds
    .map((accountId): UnlistedAccount => {
      const entry = holdings.byAccountId[accountId]
      return {
        accountId,
        value: entry?.value ?? 0,
        holdingCount: entry?.holdings.length ?? 0,
      }
    })
    .sort((a, b) => b.value - a.value)
}
