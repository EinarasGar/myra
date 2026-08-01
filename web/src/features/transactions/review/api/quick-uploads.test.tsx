import { QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { IdentifiableQuickUploadResponse } from "@/api"
import { queryKeys } from "@/lib/query"

import { createTestQueryClient, TEST_USER_ID } from "../test-harness"

const listQuickUploads = vi.fn()
const complete = vi.fn()
const createQuickUpload = vi.fn()
const retryQuickUpload = vi.fn()

vi.mock("@/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api")>()),
  AIQuickUploadApiFactory: () => ({
    listQuickUploads: (userId: string, options: unknown) =>
      listQuickUploads(userId, options) as unknown,
    complete: (userId: string, id: string, body: unknown) =>
      complete(userId, id, body) as unknown,
    createQuickUpload: (userId: string, body: unknown) =>
      createQuickUpload(userId, body) as unknown,
    retryQuickUpload: (userId: string, id: string) =>
      retryQuickUpload(userId, id) as unknown,
  }),
}))

const {
  isReceiptFailed,
  isReceiptReady,
  isReceiptWorking,
  quickUploadsQueryOptions,
  upsertQuickUpload,
  useCompleteQuickUpload,
  useCreateQuickUpload,
  useQuickUploads,
  useRetryQuickUpload,
} = await import("./quick-uploads")

function upload(status: string, id = "u1"): IdentifiableQuickUploadResponse {
  return {
    id,
    created_at: "2026-07-26T06:12:00.000Z",
    updated_at: "2026-07-26T06:12:00.000Z",
    source_file_id: "f1",
    status,
    proposal_type: "receipt",
  }
}

describe("receipt status helpers", () => {
  it("reads ready, working and failed off the wire status", () => {
    expect(isReceiptReady(upload("proposal_ready"))).toBe(true)
    expect(isReceiptReady(upload("accepted"))).toBe(false)
    expect(isReceiptWorking(upload("pending"))).toBe(true)
    expect(isReceiptWorking(upload("processing"))).toBe(true)
    expect(isReceiptWorking(upload("proposal_ready"))).toBe(false)
    expect(isReceiptFailed(upload("failed"))).toBe(true)
  })
})

describe("quickUploadsQueryOptions", () => {
  it("owns the quick-upload list node and serves the whole list", () => {
    expect(quickUploadsQueryOptions(TEST_USER_ID).queryKey).toEqual(
      queryKeys.user(TEST_USER_ID).ai.quickUploads.list()
    )
  })

  it("is the same payload the dashboard counts from", async () => {
    listQuickUploads.mockResolvedValue({
      data: [upload("proposal_ready", "a"), upload("processing", "b")],
    })
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useQuickUploads(TEST_USER_ID), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2)
    })
    expect((result.current.data ?? []).filter(isReceiptReady)).toHaveLength(1)
  })
})

describe("useCompleteQuickUpload", () => {
  it("files a receipt and drops it from the cached list before the server answers", async () => {
    complete.mockImplementation(() => new Promise(() => {}))
    const queryClient = createTestQueryClient()
    const listKey = queryKeys.user(TEST_USER_ID).ai.quickUploads.list()
    queryClient.setQueryData(listKey, [
      upload("proposal_ready", "a"),
      upload("proposal_ready", "b"),
    ])

    const { result } = renderHook(() => useCompleteQuickUpload(TEST_USER_ID), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    result.current.mutate({ quickUploadId: "a", accepted: true })

    await waitFor(() => {
      expect(
        queryClient.getQueryData<IdentifiableQuickUploadResponse[]>(listKey)
      ).toHaveLength(1)
    })
    expect(complete).toHaveBeenCalledWith(TEST_USER_ID, "a", {
      accepted: true,
    })
  })
})

describe("useCreateQuickUpload", () => {
  it("hands a confirmed file to Myra and adds the row to the one cached list", async () => {
    createQuickUpload.mockResolvedValue({ data: upload("pending", "new") })
    const queryClient = createTestQueryClient()
    const listKey = queryKeys.user(TEST_USER_ID).ai.quickUploads.list()
    queryClient.setQueryData(listKey, [upload("proposal_ready", "a")])

    const { result } = renderHook(() => useCreateQuickUpload(TEST_USER_ID), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    result.current.mutate({ fileId: "file-1" })

    await waitFor(() => {
      expect(
        queryClient.getQueryData<IdentifiableQuickUploadResponse[]>(listKey)
      ).toHaveLength(2)
    })
    expect(createQuickUpload).toHaveBeenCalledWith(TEST_USER_ID, {
      file_id: "file-1",
    })
  })
})

describe("useRetryQuickUpload", () => {
  it("shows the receipt as working again before the server answers", async () => {
    retryQuickUpload.mockImplementation(() => new Promise(() => {}))
    const queryClient = createTestQueryClient()
    const listKey = queryKeys.user(TEST_USER_ID).ai.quickUploads.list()
    queryClient.setQueryData(listKey, [upload("failed", "a")])

    const { result } = renderHook(() => useRetryQuickUpload(TEST_USER_ID), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    result.current.mutate({ quickUploadId: "a" })

    await waitFor(() => {
      const rows =
        queryClient.getQueryData<IdentifiableQuickUploadResponse[]>(listKey)
      expect(rows?.[0]?.status).toBe("pending")
    })
  })

  it("puts the failure back when the retry is rejected", async () => {
    retryQuickUpload.mockRejectedValue({
      kind: "conflict",
      message: "Not retryable.",
    })
    const queryClient = createTestQueryClient()
    const listKey = queryKeys.user(TEST_USER_ID).ai.quickUploads.list()
    queryClient.setQueryData(listKey, [upload("failed", "a")])

    const { result } = renderHook(() => useRetryQuickUpload(TEST_USER_ID), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    result.current.mutate({ quickUploadId: "a" })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    const rows =
      queryClient.getQueryData<IdentifiableQuickUploadResponse[]>(listKey)
    expect(rows?.[0]?.status).toBe("failed")
  })
})

describe("upsertQuickUpload", () => {
  it("replaces a row in place rather than appending a duplicate", () => {
    const queryClient = createTestQueryClient()
    const listKey = queryKeys.user(TEST_USER_ID).ai.quickUploads.list()
    queryClient.setQueryData(listKey, [
      upload("pending", "a"),
      upload("pending", "b"),
    ])

    upsertQuickUpload(queryClient, TEST_USER_ID, upload("proposal_ready", "b"))

    const rows =
      queryClient.getQueryData<IdentifiableQuickUploadResponse[]>(listKey)
    expect(rows).toHaveLength(2)
    expect(rows?.[1]?.status).toBe("proposal_ready")
  })
})
