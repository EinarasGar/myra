import type { UpdateTransactionRequest } from "@/api";
import { IndividualTransactionsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function useMoveTransactionToIndividual(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      data,
    }: {
      transactionId: string;
      data: UpdateTransactionRequest;
    }) =>
      IndividualTransactionsApiFactory().updateAnExistingIndividualTransaction(
        userId,
        transactionId,
        data,
      ),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.COMBINED_TRANSACTIONS],
      });
    },
  });
}
