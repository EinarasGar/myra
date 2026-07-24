import { TransactionsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSetTransactionVisibility(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      visibility,
    }: {
      transactionId: string;
      visibility: "default" | "ghost" | "hidden";
    }) =>
      TransactionsApiFactory().setTransactionVisibility(userId, transactionId, {
        visibility,
      }),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.COMBINED_TRANSACTIONS],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.ACCOUNT_TRANSACTIONS],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.INDIVIDUAL_TRANSACTIONS],
      });
    },
  });
}
