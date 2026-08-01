export const MAX_UPLOAD_BYTES = 20_971_520

export const MAX_FILE_NAME_LENGTH = 255

export interface UploadPolicy {
  readonly mimeTypes: readonly string[]
  readonly maxBytes: number
  readonly accept: string
  readonly typesLabel: string
}

const DOCUMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const

export const RECEIPT_POLICY: UploadPolicy = {
  mimeTypes: DOCUMENT_TYPES,
  maxBytes: MAX_UPLOAD_BYTES,
  accept: DOCUMENT_TYPES.join(","),
  typesLabel: "PNG, JPEG, WebP, HEIC or PDF",
}

export const ATTACHMENT_POLICY: UploadPolicy = RECEIPT_POLICY

export const REJECTION_REASONS = {
  type: "type",
  size: "size",
  empty: "empty",
  name: "name",
} as const

export type RejectionReason =
  (typeof REJECTION_REASONS)[keyof typeof REJECTION_REASONS]

export type FileVerdict =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reason: RejectionReason
      readonly why: string
    }

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

function baseMimeType(type: string): string {
  return type.split(";")[0]?.trim().toLowerCase() ?? ""
}

export function checkFile(file: File, policy: UploadPolicy): FileVerdict {
  const name = file.name.trim()
  if (name === "" || name.length > MAX_FILE_NAME_LENGTH) {
    return {
      ok: false,
      reason: REJECTION_REASONS.name,
      why: `File names must be 1 to ${String(MAX_FILE_NAME_LENGTH)} characters.`,
    }
  }
  if (name.includes("/") || name.includes("\\")) {
    return {
      ok: false,
      reason: REJECTION_REASONS.name,
      why: "File names cannot contain / or \\.",
    }
  }
  if (!policy.mimeTypes.includes(baseMimeType(file.type))) {
    return {
      ok: false,
      reason: REJECTION_REASONS.type,
      why: `Sverto reads ${policy.typesLabel}. This one is ${file.type === "" ? "of an unknown type" : file.type}.`,
    }
  }
  if (file.size <= 0) {
    return {
      ok: false,
      reason: REJECTION_REASONS.empty,
      why: "This file is empty, so there is nothing to read.",
    }
  }
  if (file.size > policy.maxBytes) {
    return {
      ok: false,
      reason: REJECTION_REASONS.size,
      why: `${formatBytes(file.size)} is over the ${formatBytes(policy.maxBytes)} limit.`,
    }
  }
  return { ok: true }
}

export function isImageType(mimeType: string): boolean {
  return baseMimeType(mimeType).startsWith("image/")
}
