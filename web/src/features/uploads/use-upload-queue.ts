import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getErrorMessage, isNormalizedError } from "@/lib/errors"
import type { FileId, UserId } from "@/lib/query"

import { uploadFile, UPLOAD_STAGES, type UploadStage } from "./api/upload-file"
import { checkFile, isImageType, type UploadPolicy } from "./policy"

export const UPLOAD_PHASES = {
  rejected: "rejected",
  queued: "queued",
  registering: "registering",
  uploading: "uploading",
  confirming: "confirming",
  linking: "linking",
  done: "done",
  canceled: "canceled",
  failed: "failed",
} as const

export type UploadPhase = (typeof UPLOAD_PHASES)[keyof typeof UPLOAD_PHASES]

const IN_FLIGHT_PHASES = new Set<UploadPhase>([
  UPLOAD_PHASES.queued,
  UPLOAD_PHASES.registering,
  UPLOAD_PHASES.uploading,
  UPLOAD_PHASES.confirming,
  UPLOAD_PHASES.linking,
])

export function isUploadInFlight(phase: UploadPhase): boolean {
  return IN_FLIGHT_PHASES.has(phase)
}

export function isUploadRetryable(phase: UploadPhase): boolean {
  return phase === UPLOAD_PHASES.failed || phase === UPLOAD_PHASES.canceled
}

export interface UploadItem {
  readonly id: string
  readonly name: string
  readonly size: number
  readonly mimeType: string
  readonly phase: UploadPhase
  readonly progress: number
  readonly reason: string | null
  readonly fileId: FileId | null
  readonly previewUrl: string | null
}

export interface UploadQueueOptions {
  readonly userId: UserId
  readonly policy: UploadPolicy
  readonly onUploaded?: (fileId: FileId, file: File) => Promise<void> | void
  readonly onRemoved?: (fileId: FileId) => void
  readonly maxConcurrent?: number
}

export interface UploadQueue {
  readonly items: readonly UploadItem[]
  readonly inFlightCount: number
  readonly doneCount: number
  readonly failedCount: number
  readonly isBusy: boolean
  add: (files: ArrayLike<File>) => void
  cancel: (id: string) => void
  retry: (id: string) => void
  dismiss: (id: string) => void
  clearSettled: () => void
}

const STAGE_PHASE: Record<UploadStage, UploadPhase> = {
  [UPLOAD_STAGES.registering]: UPLOAD_PHASES.registering,
  [UPLOAD_STAGES.uploading]: UPLOAD_PHASES.uploading,
  [UPLOAD_STAGES.confirming]: UPLOAD_PHASES.confirming,
}

let sequence = 0

function nextId(): string {
  sequence += 1
  return `upload-${String(sequence)}`
}

function previewFor(file: File): string | null {
  if (!isImageType(file.type)) return null
  if (typeof URL.createObjectURL !== "function") return null
  try {
    return URL.createObjectURL(file)
  } catch {
    return null
  }
}

function releasePreview(url: string | null): void {
  if (url === null) return
  if (typeof URL.revokeObjectURL !== "function") return
  URL.revokeObjectURL(url)
}

async function pool(
  ids: readonly string[],
  limit: number,
  worker: (id: string) => Promise<void>
): Promise<void> {
  const pending = [...ids]
  const lanes = Array.from(
    { length: Math.max(1, Math.min(limit, pending.length)) },
    async () => {
      for (;;) {
        const id = pending.shift()
        if (id === undefined) return
        await worker(id)
      }
    }
  )
  await Promise.all(lanes)
}

export function useUploadQueue(options: UploadQueueOptions): UploadQueue {
  const { userId, policy, onUploaded, onRemoved, maxConcurrent = 3 } = options

  const [items, setItems] = useState<readonly UploadItem[]>([])
  const filesRef = useRef(new Map<string, File>())
  const controllersRef = useRef(new Map<string, AbortController>())
  const previewsRef = useRef(new Map<string, string>())
  const fileIdsRef = useRef(new Map<string, FileId>())
  const itemsRef = useRef(items)
  const uploadedRef = useRef(onUploaded)
  const removedRef = useRef(onRemoved)

  useEffect(() => {
    itemsRef.current = items
    uploadedRef.current = onUploaded
    removedRef.current = onRemoved
  }, [items, onRemoved, onUploaded])

  useEffect(() => {
    const previews = previewsRef.current
    const controllers = controllersRef.current
    return () => {
      for (const url of previews.values()) releasePreview(url)
      previews.clear()
      for (const controller of controllers.values()) controller.abort()
      controllers.clear()
    }
  }, [])

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...changes } : item))
    )
  }, [])

  const run = useCallback(
    async (id: string) => {
      const file = filesRef.current.get(id)
      if (file === undefined) return

      const controller = new AbortController()
      controllersRef.current.set(id, controller)
      patch(id, {
        phase: UPLOAD_PHASES.registering,
        progress: 0,
        reason: null,
      })

      try {
        const fileId =
          fileIdsRef.current.get(id) ??
          (await uploadFile({
            userId,
            file,
            signal: controller.signal,
            onStage: (stage) => {
              patch(id, { phase: STAGE_PHASE[stage] })
            },
            onProgress: (fraction) => {
              patch(id, { progress: fraction })
            },
          }))

        fileIdsRef.current.set(id, fileId)
        patch(id, {
          fileId,
          progress: 1,
          phase: UPLOAD_PHASES.linking,
        })
        await uploadedRef.current?.(fileId, file)
        patch(id, { phase: UPLOAD_PHASES.done })
      } catch (error) {
        const wasCanceled =
          controller.signal.aborted ||
          (isNormalizedError(error) && error.kind === "canceled")
        patch(id, {
          phase: wasCanceled ? UPLOAD_PHASES.canceled : UPLOAD_PHASES.failed,
          reason: wasCanceled
            ? "You canceled this upload."
            : getErrorMessage(error),
        })
      } finally {
        controllersRef.current.delete(id)
      }
    },
    [patch, userId]
  )

  const add = useCallback(
    (files: ArrayLike<File>) => {
      const accepted: string[] = []
      const created: UploadItem[] = []

      for (const file of Array.from(files)) {
        const id = nextId()
        const verdict = checkFile(file, policy)
        const preview = verdict.ok ? previewFor(file) : null
        if (preview !== null) previewsRef.current.set(id, preview)
        created.push({
          id,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          phase: verdict.ok ? UPLOAD_PHASES.queued : UPLOAD_PHASES.rejected,
          progress: 0,
          reason: verdict.ok ? null : verdict.why,
          fileId: null,
          previewUrl: preview,
        })
        if (verdict.ok) {
          filesRef.current.set(id, file)
          accepted.push(id)
        }
      }

      if (created.length === 0) return
      setItems((previous) => [...previous, ...created])
      void pool(accepted, maxConcurrent, run)
    },
    [maxConcurrent, policy, run]
  )

  const cancel = useCallback((id: string) => {
    controllersRef.current.get(id)?.abort()
  }, [])

  const retry = useCallback(
    (id: string) => {
      void pool([id], 1, run)
    },
    [run]
  )

  const forget = useCallback((id: string) => {
    releasePreview(previewsRef.current.get(id) ?? null)
    previewsRef.current.delete(id)
    filesRef.current.delete(id)
    fileIdsRef.current.delete(id)
  }, [])

  const dismiss = useCallback(
    (id: string) => {
      controllersRef.current.get(id)?.abort()
      const fileId = fileIdsRef.current.get(id)
      if (fileId !== undefined) removedRef.current?.(fileId)
      forget(id)
      setItems((previous) => previous.filter((item) => item.id !== id))
    },
    [forget]
  )

  const clearSettled = useCallback(() => {
    for (const item of itemsRef.current) {
      if (!isUploadInFlight(item.phase)) forget(item.id)
    }
    setItems((previous) =>
      previous.filter((item) => isUploadInFlight(item.phase))
    )
  }, [forget])

  const counts = useMemo(() => {
    let inFlight = 0
    let done = 0
    let failed = 0
    for (const item of items) {
      if (isUploadInFlight(item.phase)) inFlight += 1
      else if (item.phase === UPLOAD_PHASES.done) done += 1
      else if (
        item.phase === UPLOAD_PHASES.failed ||
        item.phase === UPLOAD_PHASES.rejected
      ) {
        failed += 1
      }
    }
    return { inFlight, done, failed }
  }, [items])

  return {
    items,
    inFlightCount: counts.inFlight,
    doneCount: counts.done,
    failedCount: counts.failed,
    isBusy: counts.inFlight > 0,
    add,
    cancel,
    retry,
    dismiss,
    clearSettled,
  }
}
