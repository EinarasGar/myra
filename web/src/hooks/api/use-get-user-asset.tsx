import { UserAssetsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

const getUserAsset = async (userId: string, assetId: number) => {
  const data = await UserAssetsApiFactory().getUserAsset(userId, assetId);
  return data;
};

export default function useGetUserAsset(userId: string, assetId: number) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.USER_ASSET_DETAIL, assetId],
    queryFn: () => getUserAsset(userId, assetId),
  });
}
