import { UserAssetsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function useDeleteAssetPair(userId: string, assetId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (referenceId: number) =>
      UserAssetsApiFactory().deleteAssetPair(userId, assetId, referenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_ASSET_DETAIL, assetId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_ASSET_PAIR] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_ASSET_PAIR_RATES] });
    },
  });
}
