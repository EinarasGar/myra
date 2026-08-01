import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RECEIPT_POLICY } from "./policy"

const uploadFile = vi.fn()

vi.mock("./api/upload-file", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api/upload-file")>()),
  uploadFile: (init: unknown) => uploadFile(init) as unknown,
}))

const { isUploadInFlight, UPLOAD_PHASES, useUploadQueue } =
  await import("./use-upload-queue")

const TEST_USER_ID = "00000000-0000-0000-0000-000000000000"

function fileOf(name: string, type = "image/png", size = 1024): File {
  const file = new File(["receipt"], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

function setup(onUploaded?: (fileId: string, file: File) => Promise<void>) {
  return renderHook(() =>
    useUploadQueue({
      userId: TEST_USER_ID,
      policy: RECEIPT_POLICY,
      ...(onUploaded === undefined ? {} : { onUploaded }),
    })
  )
}

beforeEach(() => {
  uploadFile.mockReset()
})

describe("useUploadQueue", () => {
  it("walks a file through upload and hands the file id on", async () => {
    uploadFile.mockResolvedValue("file-1")
    const linked: string[] = []
    const { result } = setup((fileId) => {
      linked.push(fileId)
      return Promise.resolve()
    })

    act(() => {
      result.current.add([fileOf("receipt.png")])
    })

    await waitFor(() => {
      expect(result.current.items[0]?.phase).toBe(UPLOAD_PHASES.done)
    })
    expect(result.current.items[0]?.fileId).toBe("file-1")
    expect(linked).toEqual(["file-1"])
    expect(result.current.isBusy).toBe(false)
  })

  it("reports upload progress on the item as it streams", async () => {
    let report: ((fraction: number) => void) | null = null
    let finish: ((fileId: string) => void) | null = null
    uploadFile.mockImplementation(
      (init: {
        onProgress?: (fraction: number) => void
        onStage?: (stage: string) => void
      }) =>
        new Promise((resolve) => {
          init.onStage?.("uploading")
          report = init.onProgress ?? null
          finish = resolve as (fileId: string) => void
        })
    )
    const { result } = setup()

    act(() => {
      result.current.add([fileOf("receipt.png")])
    })
    await waitFor(() => {
      expect(result.current.items[0]?.phase).toBe(UPLOAD_PHASES.uploading)
    })

    act(() => {
      report?.(0.42)
    })
    expect(result.current.items[0]?.progress).toBeCloseTo(0.42)

    act(() => {
      finish?.("file-2")
    })
    await waitFor(() => {
      expect(result.current.items[0]?.phase).toBe(UPLOAD_PHASES.done)
    })
    expect(result.current.items[0]?.progress).toBe(1)
  })

  it("rejects an unsupported type without ever calling the API", async () => {
    const { result } = setup()

    act(() => {
      result.current.add([fileOf("statement.csv", "text/csv", 200)])
    })

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1)
    })
    expect(result.current.items[0]?.phase).toBe(UPLOAD_PHASES.rejected)
    expect(result.current.items[0]?.reason).toContain("text/csv")
    expect(uploadFile).not.toHaveBeenCalled()
    expect(result.current.failedCount).toBe(1)
  })

  it("surfaces a failure and retries it from the top", async () => {
    uploadFile.mockRejectedValueOnce({
      kind: "serverError",
      message: "The file store is unavailable.",
    })
    const { result } = setup()

    act(() => {
      result.current.add([fileOf("receipt.png")])
    })
    await waitFor(() => {
      expect(result.current.items[0]?.phase).toBe(UPLOAD_PHASES.failed)
    })
    expect(result.current.items[0]?.reason).toBe(
      "The file store is unavailable."
    )

    uploadFile.mockResolvedValueOnce("file-3")
    const id = result.current.items[0]?.id ?? ""
    act(() => {
      result.current.retry(id)
    })

    await waitFor(() => {
      expect(result.current.items[0]?.phase).toBe(UPLOAD_PHASES.done)
    })
    expect(uploadFile).toHaveBeenCalledTimes(2)
  })

  it("aborts the in-flight request when the upload is canceled", async () => {
    let observed: AbortSignal | null = null
    uploadFile.mockImplementation(
      (init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          observed = init.signal
          init.signal.addEventListener("abort", () => {
            reject({ kind: "canceled", message: "Upload canceled." })
          })
        })
    )
    const { result } = setup()

    act(() => {
      result.current.add([fileOf("receipt.png")])
    })
    await waitFor(() => {
      expect(isUploadInFlight(result.current.items[0]?.phase ?? "done")).toBe(
        true
      )
    })

    act(() => {
      result.current.cancel(result.current.items[0]?.id ?? "")
    })

    await waitFor(() => {
      expect(result.current.items[0]?.phase).toBe(UPLOAD_PHASES.canceled)
    })
    expect((observed as AbortSignal | null)?.aborted).toBe(true)
  })

  it("does not re-upload a file whose link step failed", async () => {
    uploadFile.mockResolvedValue("file-4")
    let attempts = 0
    const { result } = setup(() => {
      attempts += 1
      return attempts === 1
        ? Promise.reject({ kind: "serverError", message: "Myra is busy." })
        : Promise.resolve()
    })

    act(() => {
      result.current.add([fileOf("receipt.png")])
    })
    await waitFor(() => {
      expect(result.current.items[0]?.phase).toBe(UPLOAD_PHASES.failed)
    })

    act(() => {
      result.current.retry(result.current.items[0]?.id ?? "")
    })
    await waitFor(() => {
      expect(result.current.items[0]?.phase).toBe(UPLOAD_PHASES.done)
    })
    expect(uploadFile).toHaveBeenCalledTimes(1)
    expect(attempts).toBe(2)
  })

  it("drops a dismissed item and keeps the rest", async () => {
    uploadFile.mockResolvedValue("file-5")
    const { result } = setup()

    act(() => {
      result.current.add([fileOf("a.png"), fileOf("b.png")])
    })
    await waitFor(() => {
      expect(result.current.doneCount).toBe(2)
    })

    act(() => {
      result.current.dismiss(result.current.items[0]?.id ?? "")
    })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]?.name).toBe("b.png")
  })
})
