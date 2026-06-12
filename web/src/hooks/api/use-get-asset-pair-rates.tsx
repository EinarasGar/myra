import { AssetsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

const getAssetPairRates = async (
  assetId: number,
  referenceId: number,
  range: string,
) => {
  const data = await AssetsApiFactory().getAssetPairRates(
    assetId,
    referenceId,
    range,
  );
  return data;
};

export default function useGetAssetPairRates(
  assetId: number,
  referenceId: number,
  range: string,
) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.GLOBAL_ASSET_PAIR_RATES, assetId, referenceId, range],
    queryFn: () => getAssetPairRates(assetId, referenceId, range),
  });
}
