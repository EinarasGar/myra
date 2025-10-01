import { AssetsApiFactory, GetAssetsLineResponseViewModel } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useQuery } from "@tanstack/react-query";
import { PaginatedResponse } from "@/types/pagination";
import { useAssetStore } from "../store/use-asset-store";

export default function useSearchAssets(query?: string | null) {
  const addAsset = useAssetStore((state) => state.add);
  const addAssetType = useAssetStore((state) => state.addType);

  const searchAssets = async (
    count?: number,
    start?: number,
    query?: string | null,
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<GetAssetsLineResponseViewModel>> => {
    const data = await AssetsApiFactory().searchAssets(
      count,
      start,
      query || undefined,
      {
        signal,
      },
    );
    addAsset(
      data.data.results.map((asset) => {
        return {
          id: asset.asset_id,
          asset_type_id: asset.asset_type,
          ...asset,
        };
      }),
    );
    addAssetType(
      data.data.lookup_tables.asset_types.map((assetType) => {
        return {
          id: assetType.id,
          name: assetType.name,
        };
      }),
    );
    return {
      totalCount: data.data.total_results,
      data: data.data.results,
    };
  };

  return useQuery({
    queryKey: [QueryKeys.ASSETS, query],
    queryFn: ({ signal }) => {
      return searchAssets(20, 0, query, signal);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
