import {
  AccountsApiFactory,
  AddAccountRequestViewModel,
  UpdateAccountViewModel,
} from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import {
  useMutation,
  useSuspenseQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ExpandedAccount } from "@/types/account";

export function useGetUserAccounts(userId: string) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.USER_ACCOUNTS, userId],
    queryFn: async () => {
      const response = await AccountsApiFactory().getAccounts(userId);
      const { accounts, lookup_tables } = response.data;

      const expanded: ExpandedAccount[] = accounts.map((acc) => {
        const accountType = lookup_tables.account_types.find(
          (t) => t.id === acc.account_type,
        );
        const liquidityType = lookup_tables.account_liquidity_types.find(
          (t) => t.id === acc.liquidity_type,
        );
        return {
          id: acc.account_id,
          name: acc.name,
          accountType: accountType
            ? { id: accountType.id, name: accountType.name }
            : undefined,
          liquidityType: liquidityType
            ? { id: liquidityType.id, name: liquidityType.name }
            : undefined,
          ownershipShare: acc.ownership_share ?? 1,
        };
      });

      return expanded;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useGetAccountTypes() {
  return useSuspenseQuery({
    queryKey: [QueryKeys.ACCOUNT_TYPES],
    queryFn: async () => {
      const response = await AccountsApiFactory().getAccountTypes();
      return response.data.account_types;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useGetAccountLiquidityTypes() {
  return useSuspenseQuery({
    queryKey: [QueryKeys.ACCOUNT_LIQUIDITY_TYPES],
    queryFn: async () => {
      const response = await AccountsApiFactory().getAccountLiquidityTypes();
      return response.data.account_liquidity_types;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateAccount(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddAccountRequestViewModel) =>
      AccountsApiFactory().addAccount(userId, data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.USER_ACCOUNTS, userId],
      });
    },
  });
}

export function useUpdateAccount(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = [QueryKeys.USER_ACCOUNTS, userId];
  const mutationKey = ["mutate-accounts", userId];

  return useMutation({
    mutationKey,
    mutationFn: ({
      accountId,
      data,
    }: {
      accountId: string;
      data: UpdateAccountViewModel;
    }) => AccountsApiFactory().updateAccount(userId, accountId, data),
    onMutate: async ({ accountId, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ExpandedAccount[]>(queryKey);

      const accountTypes = queryClient.getQueryData<
        { id: number; name: string }[]
      >([QueryKeys.ACCOUNT_TYPES]);
      const liquidityTypes = queryClient.getQueryData<
        { id: number; name: string }[]
      >([QueryKeys.ACCOUNT_LIQUIDITY_TYPES]);

      queryClient.setQueryData(
        queryKey,
        (old: ExpandedAccount[] | undefined) =>
          old
            ? old.map((acc) =>
                acc.id === accountId
                  ? {
                      ...acc,
                      name: data.name ?? acc.name,
                      accountType: data.account_type
                        ? (accountTypes?.find(
                            (t) => t.id === data.account_type,
                          ) ?? acc.accountType)
                        : acc.accountType,
                      liquidityType: data.liquidity_type
                        ? (liquidityTypes?.find(
                            (t) => t.id === data.liquidity_type,
                          ) ?? acc.liquidityType)
                        : acc.liquidityType,
                      ownershipShare:
                        data.ownership_share ?? acc.ownershipShare,
                    }
                  : acc,
              )
            : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) === 1) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useDeleteAccount(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = [QueryKeys.USER_ACCOUNTS, userId];
  const mutationKey = ["mutate-accounts", userId];

  return useMutation({
    mutationKey,
    mutationFn: (accountId: string) =>
      AccountsApiFactory().deleteAccount(userId, accountId),
    onMutate: async (accountId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ExpandedAccount[]>(queryKey);
      queryClient.setQueryData(
        queryKey,
        (old: ExpandedAccount[] | undefined) =>
          old ? old.filter((acc) => acc.id !== accountId) : old,
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) === 1) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
