import type { TransactionGroupTransactionWithEntries } from '@/api';
import { TransactionGroupsApiFactory } from '@/api';
import { QueryKeys } from '@/constants/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useAddTransactionGroup(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionGroupTransactionWithEntries) =>
      TransactionGroupsApiFactory().addTransactionGroup(userId, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.COMBINED_TRANSACTIONS] });
    },
  });
}
