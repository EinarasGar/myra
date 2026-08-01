import { describe, expect, it } from "vitest"

import {
  checkFile,
  formatBytes,
  isImageType,
  MAX_UPLOAD_BYTES,
  RECEIPT_POLICY,
  REJECTION_REASONS,
} from "./policy"

function fileOf(name: string, type: string, size: number, content = "x"): File {
  const file = new File([content], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

describe("checkFile", () => {
  it("accepts the receipt formats the backend can read", () => {
    for (const type of RECEIPT_POLICY.mimeTypes) {
      expect(checkFile(fileOf("receipt", type, 1024), RECEIPT_POLICY)).toEqual({
        ok: true,
      })
    }
  })

  it("ignores charset parameters on the mime type", () => {
    expect(
      checkFile(
        fileOf("scan.pdf", "application/pdf; charset=binary", 900),
        RECEIPT_POLICY
      ).ok
    ).toBe(true)
  })

  it("names the type it will not read instead of failing silently", () => {
    const verdict = checkFile(
      fileOf("ledger.csv", "text/csv", 400),
      RECEIPT_POLICY
    )
    expect(verdict.ok).toBe(false)
    if (verdict.ok) return
    expect(verdict.reason).toBe(REJECTION_REASONS.type)
    expect(verdict.why).toContain("text/csv")
    expect(verdict.why).toContain(RECEIPT_POLICY.typesLabel)
  })

  it("rejects a file larger than the backend's 20 MB ceiling", () => {
    const verdict = checkFile(
      fileOf("huge.png", "image/png", MAX_UPLOAD_BYTES + 1),
      RECEIPT_POLICY
    )
    expect(verdict.ok).toBe(false)
    if (verdict.ok) return
    expect(verdict.reason).toBe(REJECTION_REASONS.size)
    expect(verdict.why).toContain("20 MB")
  })

  it("rejects an empty file before it wastes a presigned URL", () => {
    const verdict = checkFile(
      fileOf("blank.png", "image/png", 0, ""),
      RECEIPT_POLICY
    )
    expect(verdict.ok).toBe(false)
    if (verdict.ok) return
    expect(verdict.reason).toBe(REJECTION_REASONS.empty)
  })

  it("rejects the names the backend's FileName validator rejects", () => {
    for (const name of ["", "a".repeat(256), "nested/receipt.png"]) {
      const verdict = checkFile(fileOf(name, "image/png", 500), RECEIPT_POLICY)
      expect(verdict.ok).toBe(false)
      if (verdict.ok) continue
      expect(verdict.reason).toBe(REJECTION_REASONS.name)
    }
  })
})

describe("formatBytes", () => {
  it("keeps sizes readable at every magnitude", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(2048)).toBe("2 KB")
    expect(formatBytes(1_572_864)).toBe("1.5 MB")
    expect(formatBytes(MAX_UPLOAD_BYTES)).toBe("20 MB")
  })
})

describe("isImageType", () => {
  it("separates previewable images from documents", () => {
    expect(isImageType("image/jpeg")).toBe(true)
    expect(isImageType("application/pdf")).toBe(false)
  })
})
