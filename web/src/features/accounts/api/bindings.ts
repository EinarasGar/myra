import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import type { ConnectorBinding, GetBindingsResponse } from "@/api"
import { ConnectorsApiFactory } from "@/api"
import type { StatusWord } from "@/components/primitives"
import { api } from "@/lib/api"
import type { AccountId, BindingId, ConnectionId, UserId } from "@/lib/query"
import { apiQueryOptions, queryKeys, STALE_TIMES } from "@/lib/query"

export const BINDING_STATUSES = [
  "pending",
  "active",
  "paused",
  "error",
  "revoked",
] as const

export type BindingStatus = (typeof BINDING_STATUSES)[number] | "unknown"

export function toBindingStatus(value: string): BindingStatus {
  return (BINDING_STATUSES as readonly string[]).includes(value)
    ? (value as BindingStatus)
    : "unknown"
}

export interface AccountConnector {
  bindingId: BindingId
  connectionId: ConnectionId
  accountId: AccountId
  /** The provider's own id for the account this binding reads. */
  providerAccountId: string
  status: BindingStatus
  /** Every connector surface reads this; nothing else decides a connector's tone. */
  statusWord: StatusWord
  /** Epoch MILLISECONDS. The wire sends unix seconds. */
  createdAt: number
  lastSyncAt: number | null
  lastSyncFailed: boolean
  lastSyncError: string | null
  syncedThrough: number | null
  writesPostDirectly: boolean
}

export interface AccountConnectorsView {
  connectors: AccountConnector[]
  /**
   * An account can carry several bindings; the newest one owns the account row and the
   * dashboard's sync dot, so both screens answer for the same binding.
   */
  byAccountId: Record<string, AccountConnector | undefined>
  count: number
  needsAttentionCount: number
}

/**
 * The single mapping from a binding to a status word: every surface that shows a
 * connector reads this one, so the dashboard dot and the account chip cannot disagree.
 *
 * Two readings are deliberately pessimistic. A binding whose last run failed is still
 * `active` server-side, so the run result has to beat the stored status or a broken
 * import reads as healthy. A revoked or unrecognised binding stops importing without
 * saying so, so it is a state the UI cannot vouch for and must never render as quiet.
 */
export function connectorStatusWord(
  status: BindingStatus,
  lastSyncFailed: boolean
): StatusWord {
  switch (status) {
    case "error":
    case "revoked":
    case "unknown":
      return "needsAttention"
    case "paused":
      return "paused"
    case "pending":
      return "pending"
    case "active":
      return lastSyncFailed ? "needsAttention" : "active"
  }
}

export function toMilliseconds(
  value: number | null | undefined
): number | null {
  return value === null || value === undefined ? null : value * 1000
}

export function toAccountConnector(row: ConnectorBinding): AccountConnector {
  const status = toBindingStatus(row.status)
  const lastSyncFailed = row.last_sync_status === "failed"
  return {
    bindingId: row.id,
    connectionId: row.connection_id,
    accountId: row.sverto_account_id,
    providerAccountId: row.provider_account_id,
    status,
    statusWord: connectorStatusWord(status, lastSyncFailed),
    createdAt: row.created_at * 1000,
    lastSyncAt: toMilliseconds(row.last_sync_at),
    lastSyncFailed,
    lastSyncError: row.last_sync_error ?? null,
    syncedThrough: toMilliseconds(row.synced_through),
    writesPostDirectly: row.write_mode === "trusted",
  }
}

export function buildAccountConnectors(
  response: GetBindingsResponse
): AccountConnectorsView {
  const connectors = response.bindings
    .map(toAccountConnector)
    .sort((a, b) => a.createdAt - b.createdAt)

  const byAccountId: Record<string, AccountConnector | undefined> = {}
  for (const connector of connectors) {
    byAccountId[connector.accountId] = connector
  }

  return {
    connectors,
    byAccountId,
    count: connectors.length,
    needsAttentionCount: connectors.filter(
      (connector) => connector.statusWord === "needsAttention"
    ).length,
  }
}

export function accountConnectorsQueryOptions(userId: UserId) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).connectors.bindings.list(),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<AccountConnectorsView> => {
      const response = await api(ConnectorsApiFactory).listBindings(userId, {
        signal,
      })
      return buildAccountConnectors(response.data)
    },
    meta: { errorContext: "Connection status could not be loaded" },
  })
}

export function useAccountConnectors(userId: UserId) {
  return useQuery(accountConnectorsQueryOptions(userId))
}

export function useAccountConnectorsSuspense(
  userId: UserId
): AccountConnectorsView {
  return useSuspenseQuery(accountConnectorsQueryOptions(userId)).data
}
