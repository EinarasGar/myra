import type { TransactionGroupIdentifiableTransactionWithIdentifiableEntries } from '@/api';
import { TransactionGroupsApiFactory } from '@/api';
import { QueryKeys } from '@/constants/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function useUpdateTransactionGroup(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: TransactionGroupIdentifiableTransactionWithIdentifiableEntries }) =>
      TransactionGroupsApiFactory().updateTransactionGroup(groupId, userId, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.COMBINED_TRANSACTIONS] });
    },
  });
}
