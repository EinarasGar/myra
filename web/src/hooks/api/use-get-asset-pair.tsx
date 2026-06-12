import { AssetsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

const getAssetPair = async (assetId: number, referenceId: number) => {
  const data = await AssetsApiFactory().getAssetPair(assetId, referenceId);
  return data;
};

export default function useGetAssetPair(assetId: number, referenceId: number) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.GLOBAL_ASSET_PAIR, assetId, referenceId],
    queryFn: () => getAssetPair(assetId, referenceId),
  });
}
