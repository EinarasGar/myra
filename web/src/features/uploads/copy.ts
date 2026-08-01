import { UPLOAD_PHASES, type UploadPhase } from "./use-upload-queue"

export const DROPZONE_HEADLINE = "Drop a receipt here"

export const DROPZONE_BODY = "or choose a file from your device"

export const DROPZONE_CHOOSE = "Choose files"

export const SNAP_A_RECEIPT = "Snap a receipt"

export const RECEIPT_DIALOG_TITLE = SNAP_A_RECEIPT

export const RECEIPT_DIALOG_BODY =
  "Myra reads the photo or PDF and drafts a transaction. Nothing is written to your ledger until you confirm the draft in the review queue."

export const RECEIPT_DIALOG_CLOSE = "Done"

export const RECEIPT_DIALOG_GO_TO_REVIEW = "Review the drafts"

export const RECEIPT_READING_TITLE = "Being read by Myra"

export const RECEIPT_READY_NOTE =
  "Ready to review — confirm or discard it in the queue."

export const ATTACH_LABEL = "Attach a file"

export const ATTACH_FILE_INPUT_LABEL = "Choose files to attach"

export const ATTACHMENTS_STILL_UPLOADING =
  "Files are still uploading. Myra can see them once they finish."

const PHASE_LABELS: Record<UploadPhase, string> = {
  [UPLOAD_PHASES.rejected]: "Not accepted",
  [UPLOAD_PHASES.queued]: "Waiting",
  [UPLOAD_PHASES.registering]: "Preparing",
  [UPLOAD_PHASES.uploading]: "Uploading",
  [UPLOAD_PHASES.confirming]: "Finishing",
  [UPLOAD_PHASES.linking]: "Handing to Myra",
  [UPLOAD_PHASES.done]: "Uploaded",
  [UPLOAD_PHASES.canceled]: "Canceled",
  [UPLOAD_PHASES.failed]: "Upload failed",
}

export function uploadPhaseLabel(phase: UploadPhase): string {
  return PHASE_LABELS[phase]
}

export const RECEIPT_STEP_LABELS: Record<string, string> = {
  downloading: "Fetching the file",
  extracting: "Reading the image",
  categorising: "Matching a category",
  categorizing: "Matching a category",
  saving_results: "Writing the draft",
}

export function receiptStepLabel(step: string): string {
  return RECEIPT_STEP_LABELS[step] ?? step.replace(/_/g, " ")
}
