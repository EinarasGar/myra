import { useState } from "react";
import { Clock } from "lucide-react";
import { useQuickUploads } from "@/hooks/use-quick-uploads";
import { QuickUploadCard } from "./quick-upload-card";
import { QuickUploadReviewDialog } from "./quick-upload-review-dialog";

export function QuickUploadsSection() {
  const { items, completeQuickUpload, retry } = useQuickUploads();
  const [reviewId, setReviewId] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/40 dark:bg-orange-950/10 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="rounded-full bg-orange-100 dark:bg-orange-900/40 p-1.5">
          <Clock className="h-4 w-4 text-orange-600 dark:text-orange-300" />
        </span>
        <div>
          <div className="font-medium">Quick Uploads ({items.length})</div>
          <div className="text-xs text-muted-foreground">
            Receipts awaiting review
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <QuickUploadCard
            key={item.id}
            item={item}
            onClick={() => setReviewId(item.id)}
            onDismiss={() => void completeQuickUpload(item.id, false)}
            onRetry={() => void retry(item.id)}
          />
        ))}
      </div>
      {reviewId && (
        <QuickUploadReviewDialog
          quickUploadId={reviewId}
          open={true}
          onOpenChange={(open) => !open && setReviewId(null)}
        />
      )}
    </div>
  );
}
