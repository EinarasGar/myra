import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AIQuickUploadApiFactory } from "@/api";
import { useUserId } from "@/hooks/use-auth";
import { QueryKeys } from "@/constants/query-keys";
import { useQuickUploads } from "@/hooks/use-quick-uploads";
import { AddTransactionGroupDialog } from "../add-transaction-group/add-transaction-group-dialog";
import { groupProposalToFormValues } from "./proposal-to-form-values";
import { CorrectionChatPanel } from "./correction-chat-panel";

interface Props {
  quickUploadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickUploadReviewGroup({
  quickUploadId,
  open,
  onOpenChange,
}: Props) {
  const userId = useUserId();
  const { completeQuickUpload } = useQuickUploads();

  const detailQuery = useQuery({
    queryKey: [QueryKeys.QUICK_UPLOAD, quickUploadId],
    queryFn: async () =>
      (await AIQuickUploadApiFactory().getQuickUpload(userId, quickUploadId))
        .data,
    enabled: open,
  });

  const initialValues = useMemo(() => {
    const dto = detailQuery.data;
    if (!dto) return undefined;
    return groupProposalToFormValues(dto.proposal_data, dto.lookup_tables);
  }, [detailQuery.data]);

  if (!detailQuery.data) return null;

  return (
    <AddTransactionGroupDialog
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      initialValuesKey={`${quickUploadId}-${detailQuery.data.updated_at}`}
      onSubmittedSuccessfully={() =>
        void completeQuickUpload(quickUploadId, true)
      }
      extraSidePanel={<CorrectionChatPanel quickUploadId={quickUploadId} />}
    />
  );
}
