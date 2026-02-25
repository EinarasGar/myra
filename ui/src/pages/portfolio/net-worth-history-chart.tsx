import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import useGetProtfolioHistory from "@/hooks/api/use-get-portfolio-history";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useAuthUserId } from "@/hooks/use-auth";

import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  views: {
    label: "Page Views",
  },
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export default function NetWorthHistoryChart({ range }: { range: string }) {
  const userId = useAuthUserId();
  const { data } = useGetProtfolioHistory(userId, range);

  const rates = data?.data.sums.map((sum) => sum.rate) ?? [];
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const rateRange = maxRate - minRate;
  const bufferPercentage = 0.1; // 10% buffer
  const buffer = rateRange * bufferPercentage;
  const yAxisDomain = [minRate - buffer, maxRate + buffer];

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[250px] w-full"
    >
      <LineChart
        accessibilityLayer
        data={data.data.sums}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <YAxis
          domain={yAxisDomain}
          tickFormatter={(value) => `$${value.toFixed(2)}`}
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
              labelFormatter={(_: string, payload: { payload?: { date: number } }[]) => {
                const date = new Date((payload[0]?.payload?.date ?? 0) * 1000);
                const pad = (n: number) => n.toString().padStart(2, "0");
                return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
              }}
            />
          }
        />
        <Line
          dataKey="rate"
          type="monotone"
          stroke="var(--color-desktop)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
