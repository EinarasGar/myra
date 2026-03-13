import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import useGetUserAssetPairRates from "@/hooks/api/use-get-user-asset-pair-rates";
import { useUserId } from "@/hooks/use-auth";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const chartConfig = {
  views: { label: "Rate" },
  rate: { label: "Rate", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface Props {
  assetId: number;
  referenceId: number;
  range: string;
}

export default function AssetRateChart({ assetId, referenceId, range }: Props) {
  const userId = useUserId();
  const { data } = useGetUserAssetPairRates(
    userId,
    assetId,
    referenceId,
    range,
  );

  const rates = data?.data?.rates ?? [];
  const rateValues = rates.map((r) => r.rate);
  const minRate = rateValues.length > 0 ? Math.min(...rateValues) : 0;
  const maxRate = rateValues.length > 0 ? Math.max(...rateValues) : 1;
  const rateRange = maxRate - minRate;
  const buffer = rateRange * 0.1;
  const yAxisDomain = [minRate - buffer, maxRate + buffer];

  if (rates.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        No rate data available for this period.
      </div>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[250px] w-full"
    >
      <LineChart
        accessibilityLayer
        data={rates}
        margin={{ left: 12, right: 12 }}
      >
        <CartesianGrid vertical={false} />
        <YAxis
          domain={yAxisDomain}
          tickFormatter={(value) => `${value.toFixed(4)}`}
        />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => {
            const date = new Date(value * 1000);
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="w-[150px]"
              labelFormatter={(
                _: string,
                payload: { payload?: { date: number } }[],
              ) => {
                const date = new Date((payload[0]?.payload?.date ?? 0) * 1000);
                const pad = (n: number) => n.toString().padStart(2, "0");
                return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
              }}
            />
          }
        />
        <Line
          dataKey="rate"
          type="monotone"
          stroke="var(--color-rate)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
