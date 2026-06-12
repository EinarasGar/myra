import { useCallback, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useSearchGlobalAssets from "@/hooks/api/use-search-global-assets";

interface Props {
  query: string;
}

export default function GlobalAssetsList({ query }: Props) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSearchGlobalAssets(query);

  const assets = useMemo(
    () => data?.pages.flatMap((p) => p.results) ?? [],
    [data],
  );
  const assetTypes = useMemo(
    () => data?.pages[0]?.lookup_tables?.asset_types ?? [],
    [data],
  );
  const totalResults = data?.pages[0]?.total_results;

  const getAssetTypeName = (typeId: number) => {
    const found = assetTypes.find((t) => t.id === typeId);
    return found?.name ?? "Unknown";
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Global Assets</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-lg">No assets found.</p>
            <p className="text-muted-foreground text-sm mt-1">
              Try a different search term.
            </p>
          </div>
        ) : (
          <>
            {totalResults != null && (
              <div className="pb-2 text-sm text-muted-foreground">
                {totalResults} results
              </div>
            )}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="divide-y overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 300px)" }}
            >
              {assets.map((asset) => (
                <Link
                  key={asset.asset_id}
                  to="/global-assets/$assetId"
                  params={{ assetId: String(asset.asset_id) }}
                  className="flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded-md transition-colors"
                >
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.ticker}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {getAssetTypeName(asset.asset_type)}
                  </span>
                </Link>
              ))}
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
