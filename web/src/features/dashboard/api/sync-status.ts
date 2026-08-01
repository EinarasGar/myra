import { useMemo } from "react"

import type { StatusWord } from "@/components/primitives"
import type { AccountConnectorsView } from "@/features/accounts/api"
import { useAccountConnectors } from "@/features/accounts/api"
import type { UserId } from "@/lib/query"

export type AccountSyncIndex = Record<string, StatusWord | undefined>

export function isSyncTrouble(
  status: StatusWord | undefined
): status is StatusWord {
  return status !== undefined && status !== "active"
}

export function buildAccountSyncIndex(
  connectors: AccountConnectorsView
): AccountSyncIndex {
  const index: AccountSyncIndex = {}
  for (const [accountId, connector] of Object.entries(connectors.byAccountId)) {
    if (connector !== undefined) index[accountId] = connector.statusWord
  }
  return index
}

/**
 * Deliberately not suspense: a dead connector service must cost the accounts panel its
 * dots, never its balances.
 */
export function useAccountSync(userId: UserId): AccountSyncIndex {
  const connectors = useAccountConnectors(userId).data
  return useMemo(
    () => (connectors === undefined ? {} : buildAccountSyncIndex(connectors)),
    [connectors]
  )
}
