import { UserAssetsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

const getUserAssets = async (userId: string) => {
  const data = await UserAssetsApiFactory().getUserAssets(userId);
  return data;
};

export default function useGetUserAssets(userId: string) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.USER_ASSETS],
    queryFn: () => getUserAssets(userId),
  });
}
