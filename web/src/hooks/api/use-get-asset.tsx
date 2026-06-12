import { AssetsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

const getAsset = async (assetId: number) => {
  const data = await AssetsApiFactory().getAsset(assetId);
  return data;
};

export default function useGetAsset(assetId: number) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.GLOBAL_ASSET_DETAIL, assetId],
    queryFn: () => getAsset(assetId),
  });
}
