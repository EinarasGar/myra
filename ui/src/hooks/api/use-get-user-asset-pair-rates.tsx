import { UserAssetsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

const getUserAssetPairRates = async (userId: string, assetId: number, referenceId: number, range: string) => {
  const data = await UserAssetsApiFactory().getUserAssetPairRates(userId, assetId, referenceId, range);
  return data;
};

export default function useGetUserAssetPairRates(userId: string, assetId: number, referenceId: number, range: string) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.USER_ASSET_PAIR_RATES, assetId, referenceId, range],
    queryFn: () => getUserAssetPairRates(userId, assetId, referenceId, range),
  });
}
