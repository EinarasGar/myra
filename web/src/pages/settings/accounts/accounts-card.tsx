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
import {
  AsyncBoundary,
  useAsyncBoundaryState,
} from "@/components/async-boundary";
import { AccountsCardContent } from "./accounts-card-content";
import { Skeleton } from "@/components/ui/skeleton";

function AccountsTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-md border">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton className="h-8 w-8 shrink-0" />
          <Skeleton className="h-8 w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function AccountsCard() {
  const [isAdding, setIsAdding] = useState(false);
  const [boundaryState, setBoundaryState] = useAsyncBoundaryState();

  const isDisabled =
    isAdding || boundaryState.isLoading || boundaryState.isError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={isDisabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <AsyncBoundary
          fallback={<AccountsTableSkeleton />}
          onStateChange={setBoundaryState}
        >
          <AccountsCardContent isAdding={isAdding} setIsAdding={setIsAdding} />
        </AsyncBoundary>
      </CardContent>
    </Card>
  );
}
