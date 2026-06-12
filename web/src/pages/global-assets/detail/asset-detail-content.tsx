import { useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "@/components/error-boundary-fallback";
import { LineChartSkeleton } from "@/components/line-chart-skeleton";
import useGetAsset from "@/hooks/api/use-get-asset";
import { useDefaultAssetId } from "@/hooks/use-auth";
import { TimeRangeLabels } from "@/constants/time-ranges";
import AssetPairInfo from "./asset-pair-info";
import AssetRateChart from "./asset-rate-chart";

interface Props {
  assetId: number;
}

export default function AssetDetailContent({ assetId }: Props) {
  const defaultAssetId = useDefaultAssetId();
  const { data } = useGetAsset(assetId);
  const asset = data?.data;

  const pairOptions = asset?.pairs ?? [];

  // Default the chart to the user's default asset if it's one of this asset's
  // pairs, otherwise fall back to the first available pair.
  const [selectedPairId, setSelectedPairId] = useState<number>(() => {
    if (
      defaultAssetId != null &&
      pairOptions.some((p) => p.asset_id === defaultAssetId)
    ) {
      return defaultAssetId;
    }
    return pairOptions[0]?.asset_id ?? 0;
  });
  const [timeRange, setTimeRange] = useState("1y");

  return (
    <div className="m-4 space-y-4">
      {/* Header row: asset info */}
      <div>
        <h1 className="text-2xl font-bold">{asset?.name}</h1>
        <p className="text-muted-foreground">
          {asset?.ticker} · {asset?.asset_type?.name}
        </p>
      </div>

      {/* Pair selector row */}
      {pairOptions.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            value={String(selectedPairId)}
            onValueChange={(v) => setSelectedPairId(Number(v))}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select pair" />
            </SelectTrigger>
            <SelectContent>
              {pairOptions.map((pair) => (
                <SelectItem key={pair.asset_id} value={String(pair.asset_id)}>
                  {pair.ticker} — {pair.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Pair metadata */}
      {selectedPairId > 0 && (
        <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
            <AssetPairInfo assetId={assetId} referenceId={selectedPairId} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Rate chart */}
      {selectedPairId > 0 && (
        <Card>
          <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
            <div className="grid flex-1 gap-1 text-center sm:text-left">
              <CardTitle>Rate History</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing rates for{" "}
                {TimeRangeLabels[timeRange]?.toLowerCase() ?? timeRange}
              </p>
            </div>
            <Select
              value={timeRange}
              onValueChange={(v) => v && setTimeRange(v)}
            >
              <SelectTrigger
                className="w-[160px] rounded-lg sm:ml-auto"
                aria-label="Select a value"
              >
                <SelectValue placeholder="Last year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(TimeRangeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="rounded-lg">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
              <Suspense fallback={<LineChartSkeleton />}>
                <AssetRateChart
                  assetId={assetId}
                  referenceId={selectedPairId}
                  range={timeRange}
                />
              </Suspense>
            </ErrorBoundary>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
