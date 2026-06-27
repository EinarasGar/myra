import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AsyncBoundary } from "@/components/async-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { AiUsageCardContent } from "./ai-usage-card-content";

function AiUsageSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, group) => (
        <div key={group} className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
          {Array.from({ length: 2 }).map((__, bar) => (
            <div key={bar} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function AiUsageCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Usage</CardTitle>
        <CardDescription>
          Your token consumption against the current limits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AsyncBoundary fallback={<AiUsageSkeleton />}>
          <AiUsageCardContent />
        </AsyncBoundary>
      </CardContent>
    </Card>
  );
}
