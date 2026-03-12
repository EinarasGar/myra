import { TransactionGroupsApiFactory } from '@/api';
import { QueryKeys } from '@/constants/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function useDeleteTransactionGroup(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      TransactionGroupsApiFactory().deleteAnExistingTransactionGroup(groupId, userId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.COMBINED_TRANSACTIONS] });
    },
  });
}
