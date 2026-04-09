import { UserAssetsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

const getUserAssetPair = async (
  userId: string,
  assetId: number,
  referenceId: number,
) => {
  const data = await UserAssetsApiFactory().getUserAssetPair(
    userId,
    assetId,
    referenceId,
  );
  return data;
};

export default function useGetUserAssetPair(
  userId: string,
  assetId: number,
  referenceId: number,
) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.USER_ASSET_PAIR, assetId, referenceId],
    queryFn: () => getUserAssetPair(userId, assetId, referenceId),
  });
}
