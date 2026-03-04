import { UserAssetsApiFactory } from "@/api";
import type { AddAssetPairRatesRequestViewModel } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function usePostUserAssetRate(userId: string, assetId: number, referenceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddAssetPairRatesRequestViewModel) =>
      UserAssetsApiFactory().postCustomAssetRates(userId, assetId, referenceId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_ASSET_PAIR_RATES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_ASSET_PAIR] });
    },
  });
}
