import { Camera, Loader2, Paperclip, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IdentifiableQuickUploadResponse } from "@/api";

interface QuickUploadCardProps {
  item: IdentifiableQuickUploadResponse;
  onClick: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}

function summary(item: IdentifiableQuickUploadResponse): {
  title: string;
  subtitle: string;
  amount: string | null;
} {
  const data = item.proposal_data as Record<string, unknown> | null;
  if (!data) return { title: "Receipt", subtitle: "", amount: null };
  const description = (data.description as string | undefined) ?? "Receipt";
  const date = (data.date as string | undefined) ?? "";
  const amount = (data.amount as string | undefined) ?? null;
  return { title: description, subtitle: date, amount };
}

export function QuickUploadCard({
  item,
  onClick,
  onDismiss,
  onRetry,
}: QuickUploadCardProps) {
  const isProcessing =
    item.status === "pending" ||
    item.status === "created" ||
    item.status === "processing";
  const isFailed = item.status === "failed";
  const isReady = item.status === "proposal_ready";
  const { title, subtitle, amount } = summary(item);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-2 bg-card",
        isFailed && "border-destructive/50",
        isReady && "cursor-pointer hover:bg-accent/40 transition-colors",
      )}
      onClick={isReady ? onClick : undefined}
      role={isReady ? "button" : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 text-xs">
          <Camera className="h-3 w-3" /> Quick Snap
        </span>
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <Paperclip className="h-3 w-3" /> 1
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        {amount && (
          <div className="font-semibold tabular-nums">
            {Number(amount) < 0 ? "-" : "+"}$
            {Math.abs(Number(amount)).toFixed(2)}
          </div>
        )}
      </div>
      {isProcessing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Reading receipt…
        </div>
      )}
      {isFailed && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-destructive">
            Failed to process receipt.
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      {isReady && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            Discard
          </Button>
        </div>
      )}
    </div>
  );
}
