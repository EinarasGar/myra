import { formatDistanceToNow } from "date-fns";
import type { AiUsageMetric, AiUsageWindow } from "@/api";
import { useGetAiUsage } from "@/hooks/api/use-ai-usage-api";
import { useUserId } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";

function usagePercentage({ used, limit }: AiUsageMetric): number {
  if (limit <= 0) return 0;
  return Math.min(Math.max(Math.round((used / limit) * 100), 0), 100);
}

function UsageBar({ label, metric }: { label: string; metric: AiUsageMetric }) {
  const percentage = usagePercentage(metric);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{percentage}%</span>
      </div>
      <Progress value={percentage} />
    </div>
  );
}

function UsageWindow({
  title,
  windowUsage,
}: {
  title: string;
  windowUsage: AiUsageWindow;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">
          Resets{" "}
          {formatDistanceToNow(new Date(windowUsage.reset_at), {
            addSuffix: true,
          })}
        </span>
      </div>
      <UsageBar label="Input" metric={windowUsage.input} />
      <UsageBar label="Output" metric={windowUsage.output} />
    </div>
  );
}

export function AiUsageCardContent() {
  const userId = useUserId();
  const { data: usage } = useGetAiUsage(userId);

  return (
    <div className="space-y-6">
      <UsageWindow title="Hourly" windowUsage={usage.hourly} />
      <UsageWindow title="Monthly" windowUsage={usage.monthly} />
    </div>
  );
}
