import type { UploadMetadata } from "@/api"
import { FilesApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { NormalizedError } from "@/lib/errors"
import { normalizeHttpError, normalizeTransportError } from "@/lib/errors"
import type { FileId, UserId } from "@/lib/query"

export const UPLOAD_STAGES = {
  registering: "registering",
  uploading: "uploading",
  confirming: "confirming",
} as const

export type UploadStage = (typeof UPLOAD_STAGES)[keyof typeof UPLOAD_STAGES]

export interface UploadFileInit {
  readonly userId: UserId
  readonly file: File
  readonly signal?: AbortSignal
  readonly onStage?: (stage: UploadStage) => void
  readonly onProgress?: (fraction: number) => void
}

// The browser computes Content-Length from the body and refuses to let script set it; passing
// it through would be a no-op that logs a console error on every upload.
const BROWSER_OWNED_HEADERS = new Set(["content-length", "host", "connection"])

function sendableHeaders(headers: Record<string, string>): [string, string][] {
  return Object.entries(headers).filter(
    ([name]) => !BROWSER_OWNED_HEADERS.has(name.toLowerCase())
  )
}

function canceled(): NormalizedError {
  return { kind: "canceled", message: "Upload canceled." }
}

export function putToStorage(
  metadata: UploadMetadata,
  file: File,
  init: { signal?: AbortSignal; onProgress?: (fraction: number) => void } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (init.signal?.aborted === true) {
      reject(canceled())
      return
    }

    const request = new XMLHttpRequest()
    request.open(metadata.upload_method, metadata.upload_url, true)
    for (const [name, value] of sendableHeaders(metadata.upload_headers)) {
      request.setRequestHeader(name, value)
    }

    const abort = () => {
      request.abort()
    }
    init.signal?.addEventListener("abort", abort, { once: true })

    const settle = (finish: () => void) => {
      init.signal?.removeEventListener("abort", abort)
      finish()
    }

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || event.total === 0) return
      init.onProgress?.(Math.min(1, event.loaded / event.total))
    })
    request.addEventListener("load", () => {
      settle(() => {
        if (request.status >= 200 && request.status < 300) {
          init.onProgress?.(1)
          resolve()
          return
        }
        reject(
          normalizeHttpError({
            status: request.status,
            data: request.responseText,
          })
        )
      })
    })
    request.addEventListener("error", () => {
      settle(() => {
        reject(
          normalizeTransportError(
            new Error("The file store could not be reached.")
          )
        )
      })
    })
    request.addEventListener("timeout", () => {
      settle(() => {
        reject(normalizeTransportError(new Error("The upload timed out.")))
      })
    })
    request.addEventListener("abort", () => {
      settle(() => {
        reject(canceled())
      })
    })

    request.send(file)
  })
}

// An attachment the user removes before sending is never referenced by a message, so the
// stored object would sit in the bucket forever if the record were left behind.
export async function discardUploadedFile(
  userId: UserId,
  fileId: FileId
): Promise<void> {
  try {
    await api(FilesApiFactory).deleteFile(userId, fileId)
  } catch {
    // The user has already moved on; a stale record is not worth interrupting them for.
  }
}

export async function uploadFile(init: UploadFileInit): Promise<FileId> {
  init.onStage?.(UPLOAD_STAGES.registering)
  const created = await api(FilesApiFactory).createFile(
    init.userId,
    {
      original_name: init.file.name,
      mime_type: init.file.type,
      size_bytes: init.file.size,
    },
    init.signal === undefined ? undefined : { signal: init.signal }
  )

  init.onStage?.(UPLOAD_STAGES.uploading)
  await putToStorage(created.data.upload_metadata, init.file, {
    ...(init.signal === undefined ? {} : { signal: init.signal }),
    ...(init.onProgress === undefined ? {} : { onProgress: init.onProgress }),
  })

  init.onStage?.(UPLOAD_STAGES.confirming)
  await api(FilesApiFactory).confirmFile(
    init.userId,
    created.data.id,
    init.signal === undefined ? undefined : { signal: init.signal }
  )

  return created.data.id
}
