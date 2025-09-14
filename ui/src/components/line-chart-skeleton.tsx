"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { ChartContainer } from "@/components/ui/chart";

export function LineChartSkeleton() {
  // Generate placeholder data with some variation
  const data = Array.from({ length: 7 }, (_, i) => ({
    name: `Day ${i + 1}`,
    value: Math.floor(Math.random() * 50) + 25, // Random value between 25 and 75
  }));

  // Chart configuration
  const chartConfig = {
    value: {
      label: "Value",
      color: "hsl(var(--muted-foreground))",
    },
  };

  return (
    <ChartContainer className="h-[250px] w-full" config={chartConfig}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          axisLine={{ stroke: "hsl(var(--muted))" }}
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          axisLine={{ stroke: "hsl(var(--muted))" }}
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="url(#skeletonGradient)"
          strokeWidth={2}
          dot={<CustomDot />}
          strokeDasharray="5 5"
        />
        <defs>
          <linearGradient id="skeletonGradient" x1="0" y1="0" x2="100%" y2="0">
            <stop offset="0%" stopColor="hsl(var(--muted-foreground))" />
            <stop offset="50%" stopColor="hsl(var(--muted))" />
            <stop offset="100%" stopColor="hsl(var(--muted-foreground))" />
            <animate
              attributeName="x1"
              from="-100%"
              to="100%"
              dur="1.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="x2"
              from="0%"
              to="200%"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
      </LineChart>
    </ChartContainer>
  );
}

function CustomTooltip() {
  return (
    <div className="bg-background border border-border p-2 rounded-md shadow-md">
      <p className="w-20 h-4 bg-muted animate-pulse rounded" />
      <p className="w-16 h-3 bg-muted animate-pulse rounded mt-1" />
    </div>
  );
}

function CustomDot(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="hsl(var(--muted-foreground))"
      stroke="hsl(var(--muted-foreground))"
      strokeWidth={2}
      className="animate-pulse"
    />
  );
}
