import { useMemo } from "react"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import type {
  Aspsp,
  ConnectorConnection,
  GetConnectionsResponse,
  ListProviderAccountsResponse,
} from "@/api"
import { ConnectorsApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { ConnectionId, UserId } from "@/lib/query"
import { apiQueryOptions, queryKeys, STALE_TIMES } from "@/lib/query"
import type { StatusWord } from "@/components/primitives"
import type {
  AccountConnector,
  AccountConnectorsView,
} from "@/features/accounts/api"
import {
  toMilliseconds,
  useAccountConnectorsSuspense,
} from "@/features/accounts/api"

import { providerName } from "./providers"
import type { ProviderKind } from "./providers"

export const CONNECTION_STATUSES = [
  "pending_oauth",
  "active",
  "paused",
  "error",
  "revoked",
] as const

export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number] | "unknown"

export function toConnectionStatus(value: string): ConnectionStatus {
  return (CONNECTION_STATUSES as readonly string[]).includes(value)
    ? (value as ConnectionStatus)
    : "unknown"
}

/**
 * A revoked or unrecognised connection stops importing without saying so, so it is a
 * state the UI cannot vouch for and must never render as quiet.
 */
export function connectionStatusWord(status: ConnectionStatus): StatusWord {
  switch (status) {
    case "active":
      return "active"
    case "pending_oauth":
      return "pending"
    case "paused":
      return "paused"
    case "error":
    case "revoked":
    case "unknown":
      return "needsAttention"
  }
}

export interface ProviderAccountRef {
  readonly providerAccountId: string
  readonly displayName: string
  readonly accountType: string | null
  readonly currency: string | null
}

export interface ConnectionSummary {
  readonly connectionId: ConnectionId
  readonly providerKind: string
  readonly providerLabel: string
  readonly status: ConnectionStatus
  readonly statusWord: StatusWord
  readonly credentialMode: string
  /** Epoch MILLISECONDS. The wire sends unix seconds. */
  readonly createdAt: number
  readonly consentExpiresAt: number | null
  readonly bindings: readonly AccountConnector[]
  readonly boundCount: number
  readonly needsAttentionCount: number
  readonly lastSyncAt: number | null
}

export interface ConnectionsView {
  readonly connections: readonly ConnectionSummary[]
  readonly byId: Record<string, ConnectionSummary | undefined>
  readonly countByProvider: Record<string, number>
  readonly count: number
  readonly needsAttentionCount: number
}

function toSummary(
  row: ConnectorConnection,
  bindings: readonly AccountConnector[]
): ConnectionSummary {
  const status = toConnectionStatus(row.status)
  const syncStamps = bindings
    .map((binding) => binding.lastSyncAt)
    .filter((stamp): stamp is number => stamp !== null)

  return {
    connectionId: row.id,
    providerKind: row.provider_kind,
    providerLabel: providerName(row.provider_kind),
    status,
    statusWord: connectionStatusWord(status),
    credentialMode: row.credential_mode,
    createdAt: row.created_at * 1000,
    consentExpiresAt: toMilliseconds(row.consent_expires_at),
    bindings,
    boundCount: bindings.length,
    needsAttentionCount: bindings.filter(
      (binding) => binding.statusWord === "needsAttention"
    ).length,
    lastSyncAt: syncStamps.length === 0 ? null : Math.max(...syncStamps),
  }
}

export function buildConnections(
  response: GetConnectionsResponse,
  connectors: AccountConnectorsView
): ConnectionsView {
  const byConnection = new Map<string, AccountConnector[]>()
  for (const binding of connectors.connectors) {
    const bucket = byConnection.get(binding.connectionId)
    if (bucket === undefined) byConnection.set(binding.connectionId, [binding])
    else bucket.push(binding)
  }

  const connections = response.connections
    .map((row) => toSummary(row, byConnection.get(row.id) ?? []))
    .sort((a, b) => a.createdAt - b.createdAt)

  const byId: Record<string, ConnectionSummary | undefined> = {}
  const countByProvider: Record<string, number> = {}
  for (const connection of connections) {
    byId[connection.connectionId] = connection
    countByProvider[connection.providerKind] =
      (countByProvider[connection.providerKind] ?? 0) + 1
  }

  return {
    connections,
    byId,
    countByProvider,
    count: connections.length,
    needsAttentionCount: connections.filter(
      (connection) => connection.statusWord === "needsAttention"
    ).length,
  }
}

export function connectionsQueryOptions(userId: UserId) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).connectors.connections.list(),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<GetConnectionsResponse> => {
      const response = await api(ConnectorsApiFactory).listConnections(userId, {
        signal,
      })
      return response.data
    },
    meta: { errorContext: "Your connections could not be loaded" },
  })
}

/**
 * Bindings come from the accounts feature's query — the one owner of that cache node —
 * so a connection row and an account row can never disagree about the same binding.
 */
export function useConnectionsSuspense(userId: UserId): ConnectionsView {
  const response = useSuspenseQuery(connectionsQueryOptions(userId)).data
  const connectors = useAccountConnectorsSuspense(userId)
  return useMemo(
    () => buildConnections(response, connectors),
    [response, connectors]
  )
}

export function buildProviderAccounts(
  response: ListProviderAccountsResponse
): readonly ProviderAccountRef[] {
  return response.accounts.map((account) => ({
    providerAccountId: account.provider_account_id,
    displayName: account.display_name,
    accountType: account.account_type ?? null,
    currency: account.currency ?? null,
  }))
}

export function providerAccountsQueryOptions(
  userId: UserId,
  connectionId: ConnectionId
) {
  return apiQueryOptions({
    queryKey: queryKeys
      .user(userId)
      .connectors.connections.providerAccounts(connectionId),
    staleTime: STALE_TIMES.short,
    fetch: async ({ signal }): Promise<readonly ProviderAccountRef[]> => {
      const response = await api(ConnectorsApiFactory).listProviderAccounts(
        userId,
        connectionId,
        { signal }
      )
      return buildProviderAccounts(response.data)
    },
    meta: { errorContext: "The provider's accounts could not be loaded" },
  })
}

export function useAspsps(
  userId: UserId,
  providerKind: ProviderKind,
  country: string | null
) {
  return useQuery({
    ...apiQueryOptions({
      queryKey:
        queryKeys.user(userId).connectors.aspsps.list(providerKind, country),
      staleTime: STALE_TIMES.short,
      enabled: country !== null,
      fetch: async ({ signal }): Promise<readonly Aspsp[]> => {
        const response = await api(ConnectorsApiFactory).listAspsps(
          userId,
          providerKind,
          country ?? "",
          { signal }
        )
        return response.data.aspsps
      },
      meta: { errorContext: "The list of banks could not be loaded" },
    }),
  })
}

export function useProviderAccountsSuspense(
  userId: UserId,
  connectionId: ConnectionId
): readonly ProviderAccountRef[] {
  return useSuspenseQuery(providerAccountsQueryOptions(userId, connectionId))
    .data
}
