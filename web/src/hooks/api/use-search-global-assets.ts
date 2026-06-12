import { AssetsApiFactory, type AssetsPage } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 25;

export default function useSearchGlobalAssets(query?: string) {
  return useInfiniteQuery<AssetsPage>({
    queryKey: [QueryKeys.GLOBAL_ASSETS_SEARCH, query],
    queryFn: async ({ pageParam }) => {
      const start = pageParam as number;
      const data = await AssetsApiFactory().searchAssets(
        PAGE_SIZE,
        start,
        query || undefined,
      );
      return data.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.results.length, 0);
      return loaded < lastPage.total_results ? loaded : undefined;
    },
    throwOnError: true,
  });
}
