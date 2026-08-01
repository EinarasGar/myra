import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import type { IdentifiableQuickUploadResponse } from "@/api"
import { getErrorMessage } from "@/lib/errors"
import type { QuickUploadId, UserId } from "@/lib/query"
import { queryKeys } from "@/lib/query"
import { openSseStream, parseQuickUploadEvent } from "@/lib/sse"

import {
  isReceiptWorking,
  upsertQuickUpload,
  useQuickUploads,
} from "./quick-uploads"

const openStreams = new Map<string, AbortController>()

export function quickUploadStreamPath(
  userId: UserId,
  quickUploadId: QuickUploadId
): string {
  return `/api/users/${userId}/ai/quick-upload/${quickUploadId}/subscribe`
}

function readString(source: unknown, key: string): string | undefined {
  if (typeof source !== "object" || source === null) return undefined
  const value = (source as Record<string, unknown>)[key]
  return typeof value === "string" ? value : undefined
}

export function projectStreamState(
  quickUploadId: QuickUploadId,
  state: unknown,
  fallback: IdentifiableQuickUploadResponse | undefined
): IdentifiableQuickUploadResponse | null {
  const status = readString(state, "status")
  const sourceFileId = readString(state, "source_file_id")
  if (status === undefined || sourceFileId === undefined) return null
  const proposalType = readString(state, "proposal_type")
  const proposalData =
    typeof state === "object" && state !== null
      ? (state as Record<string, unknown>)["proposal_data"]
      : undefined

  return {
    id: quickUploadId,
    status,
    source_file_id: sourceFileId,
    created_at: readString(state, "created_at") ?? fallback?.created_at ?? "",
    updated_at: readString(state, "updated_at") ?? fallback?.updated_at ?? "",
    ...(proposalType === undefined ? {} : { proposal_type: proposalType }),
    ...(proposalData === undefined ? {} : { proposal_data: proposalData }),
  }
}

export interface QuickUploadWatch {
  readonly steps: Readonly<Record<string, string>>
  readonly failures: Readonly<Record<string, string>>
  clearFailure: (quickUploadId: QuickUploadId) => void
}

export function useQuickUploadWatcher(userId: UserId): QuickUploadWatch {
  const queryClient = useQueryClient()
  const uploads = useQuickUploads(userId)
  const [steps, setSteps] = useState<Record<string, string>>({})
  const [failures, setFailures] = useState<Record<string, string>>({})
  const ownedRef = useRef(new Set<string>())

  const working = (uploads.data ?? []).filter(isReceiptWorking)
  const workingIds = working.map((upload) => upload.id).join(",")

  useEffect(() => {
    const owned = ownedRef.current
    return () => {
      for (const streamKey of owned) {
        openStreams.get(streamKey)?.abort()
        openStreams.delete(streamKey)
      }
      owned.clear()
    }
  }, [])

  useEffect(() => {
    if (workingIds === "") return
    const listKey = queryKeys.user(userId).ai.quickUploads.list()

    for (const quickUploadId of workingIds.split(",")) {
      const streamKey = `${userId}:${quickUploadId}`
      if (openStreams.has(streamKey)) continue

      const controller = new AbortController()
      openStreams.set(streamKey, controller)
      ownedRef.current.add(streamKey)

      const finish = () => {
        openStreams.delete(streamKey)
        ownedRef.current.delete(streamKey)
        setSteps((previous) => {
          const { [quickUploadId]: _removed, ...rest } = previous
          return rest
        })
        void queryClient.invalidateQueries({ queryKey: listKey })
      }

      void openSseStream({
        path: quickUploadStreamPath(userId, quickUploadId),
        signal: controller.signal,
        reconnect: false,
        onMessage: (message) => {
          const event = parseQuickUploadEvent(message)
          switch (event.type) {
            case "state": {
              const cached = queryClient
                .getQueryData<readonly IdentifiableQuickUploadResponse[]>(
                  listKey
                )
                ?.find((entry) => entry.id === quickUploadId)
              const projected = projectStreamState(
                quickUploadId,
                event.state,
                cached
              )
              if (projected !== null) {
                upsertQuickUpload(queryClient, userId, projected)
              }
              break
            }
            case "status":
              setSteps((previous) => ({
                ...previous,
                [quickUploadId]: event.step,
              }))
              break
            case "proposal":
              void queryClient.invalidateQueries({ queryKey: listKey })
              break
            case "error":
              setFailures((previous) => ({
                ...previous,
                [quickUploadId]: event.error.message,
              }))
              controller.abort()
              break
            case "done":
              controller.abort()
              break
            default:
              break
          }
        },
      })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          setFailures((previous) => ({
            ...previous,
            [quickUploadId]: getErrorMessage(error),
          }))
        })
        .finally(finish)
    }
  }, [queryClient, userId, workingIds])

  const clearFailure = useCallback((quickUploadId: QuickUploadId) => {
    setFailures((previous) => {
      const { [quickUploadId]: _removed, ...rest } = previous
      return rest
    })
  }, [])

  return { steps, failures, clearFailure }
}
