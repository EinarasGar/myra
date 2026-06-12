import { useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "@/components/error-boundary-fallback";
import { LineChartSkeleton } from "@/components/line-chart-skeleton";
import { Plus, Trash2 } from "lucide-react";
import useGetUserAsset from "@/hooks/api/use-get-user-asset";
import { useUserId } from "@/hooks/use-auth";
import { TimeRangeLabels } from "@/constants/time-ranges";
import AssetPairInfo from "./asset-pair-info";
import AssetRateChart from "./asset-rate-chart";
import AddRateDialog from "./add-rate-dialog";
import AddPairDialog from "./add-pair-dialog";
import DeletePairDialog from "./delete-pair-dialog";

interface Props {
  assetId: number;
}

export default function AssetDetailContent({ assetId }: Props) {
  const userId = useUserId();
  const { data } = useGetUserAsset(userId, assetId);
  const asset = data?.data;

  const [selectedPairId, setSelectedPairId] = useState<number>(
    asset?.base_asset?.asset_id ?? 0,
  );
  const [isAddRateOpen, setIsAddRateOpen] = useState(false);
  const [isAddPairOpen, setIsAddPairOpen] = useState(false);
  const [isDeletePairOpen, setIsDeletePairOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("1y");

  const pairOptions = asset?.pairs ?? [];
  const selectedPair = pairOptions.find((p) => p.asset_id === selectedPairId);

  return (
    <div className="m-4 space-y-4">
      {/* Header row: just asset info */}
      <div>
        <h1 className="text-2xl font-bold">{asset?.name}</h1>
        <p className="text-muted-foreground">
          {asset?.ticker} · {asset?.asset_type?.name}
        </p>
      </div>

      {/* Pair selector row */}
      <div className="flex items-center gap-2">
        {pairOptions.length > 0 && (
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
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddPairOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Pair
        </Button>
        {selectedPairId > 0 && selectedPair && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeletePairOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete Pair
          </Button>
        )}
      </div>

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
            <Button size="sm" onClick={() => setIsAddRateOpen(true)}>
              Add Rate
            </Button>
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

      <AddRateDialog
        open={isAddRateOpen}
        onOpenChange={setIsAddRateOpen}
        assetId={assetId}
        referenceId={selectedPairId}
      />

      <AddPairDialog
        open={isAddPairOpen}
        onOpenChange={setIsAddPairOpen}
        assetId={assetId}
        onPairAdded={(refId) => setSelectedPairId(refId)}
      />

      <DeletePairDialog
        open={isDeletePairOpen}
        onOpenChange={setIsDeletePairOpen}
        assetId={assetId}
        referenceId={selectedPairId}
        referenceTicker={selectedPair?.ticker}
        onPairDeleted={() => {
          const remaining = pairOptions.filter(
            (p) => p.asset_id !== selectedPairId,
          );
          setSelectedPairId(
            remaining.length > 0
              ? (asset?.base_asset?.asset_id ?? remaining[0].asset_id)
              : 0,
          );
        }}
      />
    </div>
  );
}
