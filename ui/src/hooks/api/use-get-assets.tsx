import { AssetsApiFactory, GetAssetsLineResponseViewModel } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useQuery } from "@tanstack/react-query";
import { PaginatedResponse } from "@/types/pagination";
import { useAssetStore } from "../store/use-asset-store";

export default function useSearchAssets(query: string | null) {
  const addAsset = useAssetStore((state) => state.add);
  const addAssetType = useAssetStore((state) => state.addType);

  const searchAssets = async (
    count?: number,
    start?: number,
    query?: string,
    signal?: AbortSignal
  ): Promise<PaginatedResponse<GetAssetsLineResponseViewModel>> => {
    const data = await AssetsApiFactory().searchAssets(count, start, query, {
      signal,
    });
    addAsset(
      data.data.results.map((asset) => {
        return {
          id: asset.asset_id,
          asset_type_id: asset.asset_type,
          ...asset,
        };
      })
    );
    addAssetType(
      data.data.lookup_tables.asset_types.map((assetType) => {
        return {
          id: assetType.id,
          name: assetType.name,
        };
      })
    );
    return {
      totalCount: data.data.total_results,
      data: data.data.results,
    };
  };

  return useQuery({
    queryKey: [QueryKeys.ASSETS, query],
    queryFn: ({ signal }) => {
      if (!query) {
        throw new Error("Query cannot be null");
      }
      return searchAssets(2, 0, query, signal);
    },
    enabled: !!query,
    placeholderData: {
      totalCount: 0,
      data: [],
    } as PaginatedResponse<GetAssetsLineResponseViewModel>,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
