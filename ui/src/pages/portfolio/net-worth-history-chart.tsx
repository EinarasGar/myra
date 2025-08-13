import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import useGetProtfolioHistory from "@/hooks/api/use-get-portfolio-history";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

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

export default function NetWorthHistoryChart() {
  const { data } = useGetProtfolioHistory(
    "2396480f-0052-4cf0-81dc-8cedbde5ce13",
    "1w",
  );

  // const filteredData = chartData.filter((item) => {
  //   const date = new Date(item.date);
  //   const referenceDate = new Date("2024-06-30");
  //   let daysToSubtract = 90;
  //   if (timeRange === "30d") {
  //     daysToSubtract = 30;
  //   } else if (timeRange === "7d") {
  //     daysToSubtract = 7;
  //   }
  //   const startDate = new Date(referenceDate);
  //   startDate.setDate(startDate.getDate() - daysToSubtract);
  //   return date >= startDate;
  // });

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
              // labelKey="date"
              // labelFormatter={(label) => {
              //   console.log(label);
              //   return "aa";
              // console.log(label);
              // return new Date(label).toLocaleDateString("en-US", {
              //   month: "short",
              //   day: "numeric",
              //   year: "numeric",
              // });
              // }}
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
