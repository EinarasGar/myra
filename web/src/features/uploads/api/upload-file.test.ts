import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { UploadMetadata } from "@/api"

const createFile = vi.fn()
const confirmFile = vi.fn()

vi.mock("@/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api")>()),
  FilesApiFactory: () => ({
    createFile: (userId: string, body: unknown, options: unknown) =>
      createFile(userId, body, options) as unknown,
    confirmFile: (userId: string, fileId: string, options: unknown) =>
      confirmFile(userId, fileId, options) as unknown,
  }),
}))

const { putToStorage, uploadFile } = await import("./upload-file")

const TEST_USER_ID = "00000000-0000-0000-0000-000000000000"

const METADATA: UploadMetadata = {
  upload_url: "http://storage.test/put",
  upload_method: "PUT",
  upload_headers: { "Content-Type": "image/png", "Content-Length": "1024" },
  upload_expires_in_seconds: 900,
}

interface FakeRequest {
  method: string
  url: string
  headers: [string, string][]
  body: unknown
  status: number
  responseText: string
  aborted: boolean
  finish: () => void
  fail: () => void
  progress: (loaded: number, total: number) => void
}

const requests: FakeRequest[] = []

class FakeXhr {
  upload = new EventTarget()
  private listeners = new EventTarget()
  private record: FakeRequest

  constructor() {
    const record: FakeRequest = {
      method: "",
      url: "",
      headers: [],
      body: null,
      status: 200,
      responseText: "",
      aborted: false,
      finish: () => {
        this.listeners.dispatchEvent(new Event("load"))
      },
      fail: () => {
        this.listeners.dispatchEvent(new Event("error"))
      },
      progress: (loaded, total) => {
        const event = new Event("progress") as Event & {
          lengthComputable: boolean
          loaded: number
          total: number
        }
        Object.assign(event, { lengthComputable: true, loaded, total })
        this.upload.dispatchEvent(event)
      },
    }
    this.record = record
    requests.push(record)
  }

  open(method: string, url: string) {
    this.record.method = method
    this.record.url = url
  }

  setRequestHeader(name: string, value: string) {
    this.record.headers.push([name, value])
  }

  addEventListener(type: string, listener: EventListener) {
    this.listeners.addEventListener(type, listener)
  }

  send(body: unknown) {
    this.record.body = body
  }

  abort() {
    this.record.aborted = true
    this.listeners.dispatchEvent(new Event("abort"))
  }

  get status() {
    return this.record.status
  }

  get responseText() {
    return this.record.responseText
  }
}

function fileOf(name = "receipt.png", type = "image/png", size = 1024): File {
  const file = new File(["receipt"], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

beforeEach(() => {
  requests.length = 0
  createFile.mockReset()
  confirmFile.mockReset()
  vi.stubGlobal("XMLHttpRequest", FakeXhr)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("putToStorage", () => {
  it("sends the file to the presigned URL with the server's own method", async () => {
    const pending = putToStorage(METADATA, fileOf())
    const request = requests[0]
    expect(request).toBeDefined()
    if (request === undefined) return
    expect(request.method).toBe("PUT")
    expect(request.url).toBe(METADATA.upload_url)
    request.finish()
    await expect(pending).resolves.toBeUndefined()
  })

  it("drops headers the browser refuses to let script set", async () => {
    const pending = putToStorage(METADATA, fileOf())
    const request = requests[0]
    if (request === undefined) throw new Error("no request")
    expect(request.headers).toEqual([["Content-Type", "image/png"]])
    request.finish()
    await pending
  })

  it("reports progress as a fraction and lands on one", async () => {
    const seen: number[] = []
    const pending = putToStorage(METADATA, fileOf(), {
      onProgress: (fraction) => seen.push(fraction),
    })
    const request = requests[0]
    if (request === undefined) throw new Error("no request")
    request.progress(512, 1024)
    request.finish()
    await pending
    expect(seen).toEqual([0.5, 1])
  })

  it("turns a rejected presigned URL into a normalized error", async () => {
    const pending = putToStorage(METADATA, fileOf())
    const request = requests[0]
    if (request === undefined) throw new Error("no request")
    request.status = 403
    request.responseText = "SignatureDoesNotMatch"
    request.finish()
    await expect(pending).rejects.toMatchObject({ status: 403 })
  })

  it("aborts the request when its signal is canceled", async () => {
    const controller = new AbortController()
    const pending = putToStorage(METADATA, fileOf(), {
      signal: controller.signal,
    })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ kind: "canceled" })
    expect(requests[0]?.aborted).toBe(true)
  })
})

describe("uploadFile", () => {
  it("registers, uploads and confirms in that order", async () => {
    createFile.mockResolvedValue({
      data: { id: "file-9", upload_metadata: METADATA },
    })
    confirmFile.mockResolvedValue({ data: { id: "file-9" } })
    const stages: string[] = []

    const pending = uploadFile({
      userId: TEST_USER_ID,
      file: fileOf("lunch.png"),
      onStage: (stage) => stages.push(stage),
    })

    await vi.waitFor(() => {
      expect(requests).toHaveLength(1)
    })
    requests[0]?.finish()

    await expect(pending).resolves.toBe("file-9")
    expect(createFile).toHaveBeenCalledWith(
      TEST_USER_ID,
      {
        original_name: "lunch.png",
        mime_type: "image/png",
        size_bytes: 1024,
      },
      undefined
    )
    expect(confirmFile).toHaveBeenCalledWith(TEST_USER_ID, "file-9", undefined)
    expect(stages).toEqual(["registering", "uploading", "confirming"])
  })

  it("never confirms a file whose upload failed", async () => {
    createFile.mockResolvedValue({
      data: { id: "file-10", upload_metadata: METADATA },
    })

    const pending = uploadFile({
      userId: TEST_USER_ID,
      file: fileOf(),
    })
    await vi.waitFor(() => {
      expect(requests).toHaveLength(1)
    })
    requests[0]?.fail()

    await expect(pending).rejects.toMatchObject({ kind: "network" })
    expect(confirmFile).not.toHaveBeenCalled()
  })
})
