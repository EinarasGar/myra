import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Suspense, useState } from "react";
import NetWorthHistoryChart from "./net-worth-history-chart";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "@/components/error-boundary-fallback";
import { LineChartSkeleton } from "@/components/line-chart-skeleton";

export default function NetWorthHistory() {
  const [timeRange, setTimeRange] = useState("3m");

  const timeRangeLabels: Record<string, string> = {
    "1d": "Last 24 hours",
    "1w": "Last week",
    "1m": "Last month",
    "3m": "Last 3 months",
    "6m": "Last 6 months",
    "1y": "Last year",
    all: "All time",
  };

  return (
    <>
      <Card className="m-4">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Net Worth - History</CardTitle>
            <CardDescription>
              Showing total net worth for {timeRangeLabels[timeRange]?.toLowerCase() ?? timeRange}
            </CardDescription>
          </div>
          <Select value={timeRange} onValueChange={(v) => v && setTimeRange(v)}>
            <SelectTrigger
              className="w-[160px] rounded-lg sm:ml-auto"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="1d" className="rounded-lg">
                Last 24 hours
              </SelectItem>
              <SelectItem value="1w" className="rounded-lg">
                Last week
              </SelectItem>
              <SelectItem value="1m" className="rounded-lg">
                Last month
              </SelectItem>
              <SelectItem value="3m" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="6m" className="rounded-lg">
                Last 6 months
              </SelectItem>
              <SelectItem value="1y" className="rounded-lg">
                Last year
              </SelectItem>
              <SelectItem value="all" className="rounded-lg">
                All time
              </SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
            <Suspense fallback={<LineChartSkeleton />}>
              <NetWorthHistoryChart range={timeRange} />
            </Suspense>
          </ErrorBoundary>
        </CardContent>
      </Card>
    </>
  );
}
