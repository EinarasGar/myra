import { useMemo } from "react";
import { AssetRate } from "@/api";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const chartConfig = {
  views: { label: "Rate" },
  rate: { label: "Rate", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface Props {
  rates: AssetRate[];
}

export default function AssetRateChart({ rates }: Props) {
  const yAxisDomain = useMemo(() => {
    if (rates.length === 0) return [0, 1];
    let minRate = rates[0].rate;
    let maxRate = rates[0].rate;
    for (const { rate } of rates) {
      if (rate < minRate) minRate = rate;
      if (rate > maxRate) maxRate = rate;
    }
    const buffer = (maxRate - minRate) * 0.1;
    return [minRate - buffer, maxRate + buffer];
  }, [rates]);

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
