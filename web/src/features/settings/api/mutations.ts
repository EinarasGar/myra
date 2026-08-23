import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { SyncReport } from "@/api"
import {
  BindingUpdateStatus,
  BindingWriteMode,
  ConnectorsApiFactory,
  CredentialMode,
  UsersApiFactory,
} from "@/api"
import { api } from "@/lib/api"
import type {
  AccountId,
  AssetId,
  BindingId,
  ConnectionId,
  UserId,
} from "@/lib/query"
import { mutationKeys, optimisticMutationOptions, queryKeys } from "@/lib/query"
import type { AccountConnector } from "@/features/accounts/api"
import { toAccountConnector } from "@/features/accounts/api"

import type { ProviderKind } from "./providers"

function connectorInvalidations(userId: UserId) {
  const keys = queryKeys.user(userId)
  return [keys.connectors.all(), keys.accounts.all()]
}

function importInvalidations(userId: UserId) {
  const keys = queryKeys.user(userId)
  return [
    keys.connectors.all(),
    keys.accounts.all(),
    keys.transactions.all(),
    keys.portfolio.all(),
  ]
}

export interface CreateConnectionVariables {
  providerKind: ProviderKind
  credential?: string
}

export function useCreateConnection(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<ConnectionId, CreateConnectionVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).connectors(),
      mutationFn: async ({ providerKind, credential }) => {
        const response = await api(ConnectorsApiFactory).createConnection(
          userId,
          {
            provider_kind: providerKind,
            credential_mode: CredentialMode.Stored,
            ...(credential === undefined ? {} : { credential }),
          }
        )
        return response.data.connection_id
      },
      updates: [],
      invalidate: connectorInvalidations(userId),
      meta: { errorContext: "The connection could not be created" },
    })
  )
}

export interface StartOauthVariables {
  connectionId: ConnectionId
}

export interface OauthSession {
  authUrl: string
  sessionId: string
}

export function useStartOauthSession(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<OauthSession, StartOauthVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).connectors(),
      mutationFn: async ({ connectionId }) => {
        const response = await api(ConnectorsApiFactory).createOauthSession(
          userId,
          connectionId,
          {}
        )
        return {
          authUrl: response.data.auth_url,
          sessionId: response.data.session_id,
        }
      },
      updates: [],
      invalidate: connectorInvalidations(userId),
      meta: { errorContext: "The provider consent step could not be started" },
    })
  )
}

export interface RevokeConnectionVariables {
  connectionId: ConnectionId
}

export function useRevokeConnection(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, RevokeConnectionVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).connectors(),
      mutationFn: async ({ connectionId }) => {
        await api(ConnectorsApiFactory).revokeConnection(userId, connectionId)
      },
      updates: [],
      invalidate: connectorInvalidations(userId),
      meta: { errorContext: "The connection could not be revoked" },
    })
  )
}

export interface CreateBindingVariables {
  connectionId: ConnectionId
  providerAccountId: string
  accountId: AccountId
}

export function useCreateBinding(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<BindingId, CreateBindingVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).connectors(),
      mutationFn: async ({ connectionId, providerAccountId, accountId }) => {
        const response = await api(ConnectorsApiFactory).createBinding(
          userId,
          connectionId,
          {
            provider_account_id: providerAccountId,
            sverto_account_id: accountId,
          }
        )
        return response.data.binding_id
      },
      updates: [],
      invalidate: connectorInvalidations(userId),
      meta: { errorContext: "The account could not be bound" },
    })
  )
}

export interface UpdateBindingVariables {
  bindingId: BindingId
  paused: boolean
  writesPostDirectly: boolean
}

export function useUpdateBinding(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<AccountConnector, UpdateBindingVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).connectors(),
      mutationFn: async ({ bindingId, paused, writesPostDirectly }) => {
        const response = await api(ConnectorsApiFactory).updateBinding(
          bindingId,
          userId,
          {
            status: paused
              ? BindingUpdateStatus.Paused
              : BindingUpdateStatus.Active,
            write_mode: writesPostDirectly
              ? BindingWriteMode.Trusted
              : BindingWriteMode.Ghost,
          }
        )
        return toAccountConnector(response.data)
      },
      updates: [],
      invalidate: connectorInvalidations(userId),
      meta: { errorContext: "The binding could not be saved" },
    })
  )
}

export interface DeleteBindingVariables {
  bindingId: BindingId
}

export function useDeleteBinding(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, DeleteBindingVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).connectors(),
      mutationFn: async ({ bindingId }) => {
        await api(ConnectorsApiFactory).deleteBinding(bindingId, userId)
      },
      updates: [],
      invalidate: connectorInvalidations(userId),
      meta: { errorContext: "The account could not be unbound" },
    })
  )
}

export interface SyncBindingVariables {
  bindingId: BindingId
}

export interface SyncOutcome {
  status: string
  report: SyncReport | null
}

export function useSyncBinding(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<SyncOutcome, SyncBindingVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).connectors(),
      mutationFn: async ({ bindingId }) => {
        const response = await api(ConnectorsApiFactory).syncBinding(
          userId,
          bindingId,
          {}
        )
        return {
          status: response.data.status,
          report: response.data.report ?? null,
        }
      },
      updates: [],
      invalidate: importInvalidations(userId),
      meta: { errorContext: "The sync could not be started" },
    })
  )
}

export function useDeleteUser(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, void>({
      queryClient,
      mutationKey: mutationKeys.user(userId).account(),
      mutationFn: async () => {
        await api(UsersApiFactory).deleteUser(userId)
      },
      updates: [],
      invalidate: [],
      meta: { errorContext: "Your account could not be deleted" },
    })
  )
}

export interface SetBaseCurrencyVariables {
  assetId: AssetId
}

export function useSetBaseCurrency(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, SetBaseCurrencyVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).assets(),
      mutationFn: async ({ assetId }) => {
        await api(UsersApiFactory).postBaseAsset(userId, { asset_id: assetId })
      },
      updates: [],
      invalidate: [
        queryKeys.auth.all(),
        queryKeys.user(userId).portfolio.all(),
        queryKeys.user(userId).accounts.all(),
        queryKeys.user(userId).assets.all(),
      ],
      meta: { errorContext: "Your base currency could not be changed" },
    })
  )
}
