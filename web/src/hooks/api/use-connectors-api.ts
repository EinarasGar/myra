import { ConnectorsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

const invalidateConnectors = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  queryClient.invalidateQueries({
    queryKey: [QueryKeys.CONNECTOR_CONNECTIONS],
  });
  queryClient.invalidateQueries({ queryKey: [QueryKeys.CONNECTOR_BINDINGS] });
};

export function useGetConnections(userId: string) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.CONNECTOR_CONNECTIONS, userId],
    queryFn: async () =>
      (await ConnectorsApiFactory().listConnections(userId)).data.connections.filter(
        (c) => c.status !== "revoked",
      ),
  });
}

export function useGetBindings(userId: string) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.CONNECTOR_BINDINGS, userId],
    queryFn: async () =>
      (await ConnectorsApiFactory().listBindings(userId)).data.bindings.filter(
        (b) => b.status !== "revoked",
      ),
  });
}

export function useGetProviderAccounts(userId: string, connectionId: string) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.CONNECTOR_PROVIDER_ACCOUNTS, userId, connectionId],
    queryFn: async () =>
      (await ConnectorsApiFactory().listProviderAccounts(userId, connectionId))
        .data.accounts,
  });
}

export function useCreateConnection(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      provider_kind: string;
      credential_mode: "stored" | "transient" | "client_supplied";
      credential?: string;
      provider_key_id?: string;
    }) => ConnectorsApiFactory().createConnection(userId, body),
    onSettled: () => invalidateConnectors(queryClient),
  });
}

export function useRevokeConnection(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) =>
      ConnectorsApiFactory().revokeConnection(userId, connectionId),
    onSettled: () => invalidateConnectors(queryClient),
  });
}

export function useCreateOAuthSession(userId: string) {
  return useMutation({
    mutationFn: ({
      connectionId,
      redirectUri,
    }: {
      connectionId: string;
      redirectUri: string;
    }) =>
      ConnectorsApiFactory().createOauthSession(userId, connectionId, {
        redirect_uri: redirectUri,
      }),
  });
}

export function useCompleteOAuthSession(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      connectionId,
      sessionId,
      state,
      code,
      error,
    }: {
      connectionId: string;
      sessionId: string;
      state: string;
      code?: string;
      error?: string;
    }) =>
      ConnectorsApiFactory().completeOauthSession(
        userId,
        connectionId,
        sessionId,
        {
          state,
          code: code ?? null,
          error: error ?? null,
          error_description: null,
        },
      ),
    onSettled: () => invalidateConnectors(queryClient),
  });
}

export function useCreateBinding(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      connectionId,
      svertoAccountId,
      providerAccountId,
    }: {
      connectionId: string;
      svertoAccountId: string;
      providerAccountId?: string;
    }) =>
      ConnectorsApiFactory().createBinding(userId, connectionId, {
        sverto_account_id: svertoAccountId,
        provider_account_id: providerAccountId ?? null,
      }),
    onSettled: () => invalidateConnectors(queryClient),
  });
}

export function useUpdateBinding(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bindingId,
      writeMode,
      status,
    }: {
      bindingId: string;
      writeMode: "ghost" | "trusted";
      status: "active" | "paused";
    }) =>
      ConnectorsApiFactory().updateBinding(bindingId, userId, {
        write_mode: writeMode,
        status,
      }),
    onSettled: () => invalidateConnectors(queryClient),
  });
}

export function useDeleteBinding(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bindingId: string) =>
      ConnectorsApiFactory().deleteBinding(bindingId, userId),
    onSettled: () => invalidateConnectors(queryClient),
  });
}

export function useSyncBinding(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bindingId,
      credential,
    }: {
      bindingId: string;
      credential?: string;
    }) =>
      ConnectorsApiFactory().syncBinding(userId, bindingId, {
        credential: credential ?? null,
      }),
    onSettled: () => {
      invalidateConnectors(queryClient);
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.ACCOUNT_TRANSACTIONS],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.COMBINED_TRANSACTIONS],
      });
    },
  });
}
