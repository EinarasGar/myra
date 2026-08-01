import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { IdentifiableQuickUploadResponse } from "@/api"

const listQuickUploads = vi.fn()
const createQuickUpload = vi.fn()
const retryQuickUpload = vi.fn()
const complete = vi.fn()
const uploadFile = vi.fn()

vi.mock("@/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api")>()),
  AIQuickUploadApiFactory: () => ({
    listQuickUploads: (userId: string, options: unknown) =>
      listQuickUploads(userId, options) as unknown,
    createQuickUpload: (userId: string, body: unknown) =>
      createQuickUpload(userId, body) as unknown,
    retryQuickUpload: (userId: string, id: string) =>
      retryQuickUpload(userId, id) as unknown,
    complete: (userId: string, id: string, body: unknown) =>
      complete(userId, id, body) as unknown,
  }),
}))

vi.mock("../api/upload-file", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/upload-file")>()),
  uploadFile: (init: unknown) => uploadFile(init) as unknown,
}))

vi.mock("@/lib/sse", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sse")>()),
  openSseStream: () => new Promise<void>(() => {}),
}))

const { ReceiptUploadDialog } = await import("./receipt-upload-dialog")

const TEST_USER_ID = "00000000-0000-0000-0000-000000000000"

function upload(
  status: string,
  id: string,
  proposal?: Record<string, unknown>
): IdentifiableQuickUploadResponse {
  return {
    id,
    created_at: "2026-07-31T06:12:00.000Z",
    updated_at: "2026-07-31T06:12:00.000Z",
    source_file_id: "f1",
    status,
    ...(proposal === undefined ? {} : { proposal_data: proposal }),
  }
}

function renderDialog(onReviewDrafts = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ReceiptUploadDialog
        userId={TEST_USER_ID}
        open
        onOpenChange={() => {}}
        onReviewDrafts={onReviewDrafts}
      />
    </QueryClientProvider>
  )
  return { queryClient, onReviewDrafts }
}

function pngFile(name = "receipt.png"): File {
  const file = new File(["receipt"], name, { type: "image/png" })
  Object.defineProperty(file, "size", { value: 2048 })
  return file
}

beforeEach(() => {
  listQuickUploads.mockReset()
  createQuickUpload.mockReset()
  retryQuickUpload.mockReset()
  complete.mockReset()
  uploadFile.mockReset()
  listQuickUploads.mockResolvedValue({ data: [] })
})

describe("ReceiptUploadDialog", () => {
  it("states what it accepts before anything is chosen", async () => {
    renderDialog()
    expect(await screen.findByText("Snap a receipt")).toBeInTheDocument()
    expect(screen.getByText(/PNG, JPEG, WebP, HEIC or PDF/)).toBeInTheDocument()
    expect(screen.getByText(/20 MB/)).toBeInTheDocument()
  })

  it("uploads a chosen receipt and hands its file to Myra", async () => {
    uploadFile.mockResolvedValue("file-1")
    createQuickUpload.mockResolvedValue({ data: upload("pending", "q1") })
    renderDialog()

    const input = await screen.findByLabelText<HTMLInputElement>(
      "Choose files",
      { selector: "input" }
    )
    await userEvent.upload(input, pngFile())

    await waitFor(() => {
      expect(createQuickUpload).toHaveBeenCalledWith(TEST_USER_ID, {
        file_id: "file-1",
      })
    })
    expect(await screen.findByText("Uploaded · 2 KB")).toBeInTheDocument()
  })

  it("names an unsupported file dropped on the zone instead of ignoring it", async () => {
    renderDialog()
    await screen.findByText("Snap a receipt")

    const zone = document.querySelector('[data-slot="dropzone"]')
    expect(zone).not.toBeNull()
    if (zone === null) return
    const csv = new File(["a,b"], "statement.csv", { type: "text/csv" })
    fireEvent.drop(zone, { dataTransfer: { files: [csv] } })

    expect(
      await screen.findByText(/Sverto reads PNG, JPEG, WebP, HEIC or PDF/)
    ).toBeInTheDocument()
    expect(uploadFile).not.toHaveBeenCalled()
  })

  it("accepts a receipt dropped on the zone", async () => {
    uploadFile.mockResolvedValue("file-2")
    createQuickUpload.mockResolvedValue({ data: upload("pending", "q2") })
    renderDialog()
    await screen.findByText("Snap a receipt")

    const zone = document.querySelector('[data-slot="dropzone"]')
    if (zone === null) throw new Error("no dropzone")
    fireEvent.drop(zone, { dataTransfer: { files: [pngFile("drag.png")] } })

    await waitFor(() => {
      expect(createQuickUpload).toHaveBeenCalledWith(TEST_USER_ID, {
        file_id: "file-2",
      })
    })
  })

  it("offers a retry on a receipt Myra could not read", async () => {
    listQuickUploads.mockResolvedValue({ data: [upload("failed", "q9")] })
    retryQuickUpload.mockResolvedValue({ data: undefined })
    renderDialog()

    const retry = await screen.findByRole("button", { name: "Try again" })
    await userEvent.click(retry)

    await waitFor(() => {
      expect(retryQuickUpload).toHaveBeenCalledWith(TEST_USER_ID, "q9")
    })
  })

  it("only offers the review hand-off once a draft is ready", async () => {
    listQuickUploads.mockResolvedValue({
      data: [upload("proposal_ready", "q3", { description: "Best Buy" })],
    })
    const onReviewDrafts = vi.fn()
    renderDialog(onReviewDrafts)

    expect(await screen.findByText("Best Buy")).toBeInTheDocument()
    const review = screen.getByRole("button", {
      name: "Review the drafts (1)",
    })
    await userEvent.click(review)
    expect(onReviewDrafts).toHaveBeenCalled()
  })

  it("disables the review hand-off while nothing is ready", async () => {
    listQuickUploads.mockResolvedValue({ data: [upload("processing", "q4")] })
    renderDialog()

    expect(
      await screen.findByRole("button", { name: "Review the drafts" })
    ).toBeDisabled()
  })
})
