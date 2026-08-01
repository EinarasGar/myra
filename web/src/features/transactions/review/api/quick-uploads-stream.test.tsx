import { QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { IdentifiableQuickUploadResponse } from "@/api"
import type { SseMessage } from "@/lib/sse"
import { queryKeys } from "@/lib/query"

import { createTestQueryClient, TEST_USER_ID } from "../test-harness"

const listQuickUploads = vi.fn()
const openSseStream = vi.fn()

vi.mock("@/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api")>()),
  AIQuickUploadApiFactory: () => ({
    listQuickUploads: (userId: string, options: unknown) =>
      listQuickUploads(userId, options) as unknown,
  }),
}))

vi.mock("@/lib/sse", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sse")>()),
  openSseStream: (init: unknown) => openSseStream(init) as unknown,
}))

const { projectStreamState, quickUploadStreamPath, useQuickUploadWatcher } =
  await import("./quick-uploads-stream")

function upload(status: string, id: string): IdentifiableQuickUploadResponse {
  return {
    id,
    created_at: "2026-07-31T06:12:00.000Z",
    updated_at: "2026-07-31T06:12:00.000Z",
    source_file_id: "f1",
    status,
  }
}

beforeEach(() => {
  listQuickUploads.mockReset()
  openSseStream.mockReset()
})

function message(event: string, data: unknown): SseMessage {
  return { event, data: typeof data === "string" ? data : JSON.stringify(data) }
}

describe("quickUploadStreamPath", () => {
  it("points at the endpoint the backend actually serves", () => {
    expect(quickUploadStreamPath(TEST_USER_ID, "q1")).toBe(
      `/api/users/${TEST_USER_ID}/ai/quick-upload/q1/subscribe`
    )
  })
})

describe("projectStreamState", () => {
  it("narrows the detail payload to the shape the list node holds", () => {
    const projected = projectStreamState(
      "q1",
      {
        status: "proposal_ready",
        source_file_id: "f9",
        created_at: "2026-07-31T06:00:00.000Z",
        updated_at: "2026-07-31T06:05:00.000Z",
        proposal_type: "transaction",
        proposal_data: { description: "Best Buy" },
        lookup_tables: { accounts: [], assets: [], categories: [] },
      },
      undefined
    )

    expect(projected).toEqual({
      id: "q1",
      status: "proposal_ready",
      source_file_id: "f9",
      created_at: "2026-07-31T06:00:00.000Z",
      updated_at: "2026-07-31T06:05:00.000Z",
      proposal_type: "transaction",
      proposal_data: { description: "Best Buy" },
    })
    expect(projected).not.toHaveProperty("lookup_tables")
  })

  it("refuses a payload that is missing the fields the list needs", () => {
    expect(
      projectStreamState("q1", { status: "pending" }, undefined)
    ).toBeNull()
    expect(projectStreamState("q1", "not json", undefined)).toBeNull()
  })
})

function emitterFor(quickUploadId: string): (message: SseMessage) => void {
  const call = openSseStream.mock.calls.find(([init]) =>
    (init as { path: string }).path.includes(`/${quickUploadId}/subscribe`)
  )
  if (call === undefined)
    throw new Error(`no stream opened for ${quickUploadId}`)
  return (call[0] as { onMessage: (message: SseMessage) => void }).onMessage
}

describe("useQuickUploadWatcher", () => {
  it("subscribes once per working receipt and folds state into the list", async () => {
    listQuickUploads.mockResolvedValue({ data: [upload("processing", "q1")] })
    openSseStream.mockImplementation(() => new Promise(() => {}))

    const queryClient = createTestQueryClient()
    const listKey = queryKeys.user(TEST_USER_ID).ai.quickUploads.list()
    const { result, rerender } = renderHook(
      () => useQuickUploadWatcher(TEST_USER_ID),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      }
    )

    await waitFor(() => {
      expect(openSseStream).toHaveBeenCalledTimes(1)
    })

    emitterFor("q1")(message("status", { step: "extracting" }))
    await waitFor(() => {
      expect(result.current.steps["q1"]).toBe("extracting")
    })

    emitterFor("q1")(
      message("state", {
        status: "proposal_ready",
        source_file_id: "f1",
        created_at: "2026-07-31T06:12:00.000Z",
        updated_at: "2026-07-31T06:13:00.000Z",
      })
    )
    await waitFor(() => {
      const rows =
        queryClient.getQueryData<IdentifiableQuickUploadResponse[]>(listKey)
      expect(rows?.[0]?.status).toBe("proposal_ready")
    })

    rerender()
    expect(openSseStream).toHaveBeenCalledTimes(1)
  })

  it("records a mid-stream error against the receipt it belongs to", async () => {
    listQuickUploads.mockResolvedValue({ data: [upload("processing", "q2")] })
    openSseStream.mockImplementation(() => new Promise(() => {}))

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useQuickUploadWatcher(TEST_USER_ID), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    await waitFor(() => {
      expect(openSseStream).toHaveBeenCalledTimes(1)
    })

    emitterFor("q2")(
      message("error", {
        kind: "provider_error",
        message: "Myra could not read the image.",
      })
    )

    await waitFor(() => {
      expect(result.current.failures["q2"]).toBeDefined()
    })

    result.current.clearFailure("q2")
    await waitFor(() => {
      expect(result.current.failures["q2"]).toBeUndefined()
    })
  })
})
