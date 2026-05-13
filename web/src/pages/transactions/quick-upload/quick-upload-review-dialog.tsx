import { useQuery } from "@tanstack/react-query";
import { AIQuickUploadApiFactory } from "@/api";
import { useUserId } from "@/hooks/use-auth";
import { QueryKeys } from "@/constants/query-keys";
import { QuickUploadReviewIndividual } from "./quick-upload-review-individual";
import { QuickUploadReviewGroup } from "./quick-upload-review-group";

interface QuickUploadReviewDialogProps {
  quickUploadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickUploadReviewDialog({
  quickUploadId,
  open,
  onOpenChange,
}: QuickUploadReviewDialogProps) {
  const userId = useUserId();
  const { data } = useQuery({
    queryKey: [QueryKeys.QUICK_UPLOAD, quickUploadId],
    queryFn: async () =>
      (await AIQuickUploadApiFactory().getQuickUpload(userId, quickUploadId))
        .data,
    enabled: open,
  });

  if (!data) return null;

  if (data.proposal_type === "transaction_group") {
    return (
      <QuickUploadReviewGroup
        quickUploadId={quickUploadId}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }
  return (
    <QuickUploadReviewIndividual
      quickUploadId={quickUploadId}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
