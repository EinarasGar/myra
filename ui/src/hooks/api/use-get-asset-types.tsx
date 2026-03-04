import { AssetsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

export default function useGetAssetTypes() {
  return useSuspenseQuery({
    queryKey: [QueryKeys.ASSET_TYPES],
    queryFn: () => AssetsApiFactory().getAssetTypes(),
    staleTime: 1000 * 60 * 30, // 30 minutes - types rarely change
  });
}
