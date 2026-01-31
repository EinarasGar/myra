import {
  IndividualTransactionsApiFactory,
  AddIndividualTransactionRequestViewModel,
} from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useAddIndividualTransaction(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddIndividualTransactionRequestViewModel) =>
      IndividualTransactionsApiFactory().addIndividualTransaction(userId, data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.INDIVIDUAL_TRANSACTIONS],
      });
    },
  });
}
