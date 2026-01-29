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
  const [timeRange, setTimeRange] = useState("90d");

  return (
    <>
      <Card className="m-4">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Net Worth - Hisotry</CardTitle>
            <CardDescription>
              Showing total net worth for the last 3 months
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
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
            <Suspense fallback={<LineChartSkeleton />}>
              <NetWorthHistoryChart />
            </Suspense>
          </ErrorBoundary>
        </CardContent>
      </Card>
    </>
  );
}
