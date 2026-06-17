import { UsersApiFactory, SetBaseAssetRequest } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSetBaseAsset(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetBaseAssetRequest) =>
      UsersApiFactory().postBaseAsset(userId, data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.AUTH_ME],
      });
    },
  });
}
