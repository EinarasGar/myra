import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import { AsyncBoundary, useAsyncBoundaryState } from "@/components/async-boundary";
import { CategoryTypesCardContent } from "./category-types-card-content";
import { Skeleton } from "@/components/ui/skeleton";

function CategoryTypesTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-2 rounded-md border"
        >
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CategoryTypesCard() {
  const [isAdding, setIsAdding] = useState(false);
  const [boundaryState, setBoundaryState] = useAsyncBoundaryState();

  const isDisabled =
    isAdding || boundaryState.isLoading || boundaryState.isError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Types</CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={isDisabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Type
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <AsyncBoundary
          fallback={<CategoryTypesTableSkeleton />}
          onStateChange={setBoundaryState}
        >
          <CategoryTypesCardContent
            isAdding={isAdding}
            setIsAdding={setIsAdding}
          />
        </AsyncBoundary>
      </CardContent>
    </Card>
  );
}
