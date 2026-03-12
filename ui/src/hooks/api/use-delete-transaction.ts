import { TransactionsApiFactory } from '@/api';
import { QueryKeys } from '@/constants/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function useDeleteTransaction(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) =>
      TransactionsApiFactory().deleteAnExistingTransaction(transactionId, userId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.COMBINED_TRANSACTIONS] });
    },
  });
}
