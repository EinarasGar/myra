import { TransactionGroupsApiFactory } from "@/api";
import type { TransactionGroupIdentifiableTransactionWithIdentifiableEntries } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function useGroupIndividualTransactions(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: TransactionGroupIdentifiableTransactionWithIdentifiableEntries,
    ) =>
      TransactionGroupsApiFactory().groupIndividualTransactions(userId, data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.COMBINED_TRANSACTIONS],
      });
    },
  });
}
