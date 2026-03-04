import { UserAssetsApiFactory } from "@/api";
import type { AddAssetPairRequestViewModel } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function usePostAssetPair(userId: string, assetId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddAssetPairRequestViewModel) =>
      UserAssetsApiFactory().postAssetPair(userId, assetId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_ASSET_DETAIL, assetId] });
    },
  });
}
