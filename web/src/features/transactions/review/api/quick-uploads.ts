import type { QueryClient } from "@tanstack/react-query"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { IdentifiableQuickUploadResponse } from "@/api"
import { AIQuickUploadApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { FileId, QuickUploadId, UserId } from "@/lib/query"
import {
  apiQueryOptions,
  mutationKeys,
  optimisticMutationOptions,
  queryKeys,
  STALE_TIMES,
  withNormalizedErrors,
} from "@/lib/query"

export const QUICK_UPLOAD_STATUS = {
  pending: "pending",
  processing: "processing",
  proposalReady: "proposal_ready",
  accepted: "accepted",
  rejected: "rejected",
  failed: "failed",
} as const

export type QuickUploadStatus =
  (typeof QUICK_UPLOAD_STATUS)[keyof typeof QUICK_UPLOAD_STATUS]

export function isReceiptReady(
  upload: IdentifiableQuickUploadResponse
): boolean {
  return upload.status === QUICK_UPLOAD_STATUS.proposalReady
}

export function isReceiptWorking(
  upload: IdentifiableQuickUploadResponse
): boolean {
  return (
    upload.status === QUICK_UPLOAD_STATUS.pending ||
    upload.status === QUICK_UPLOAD_STATUS.processing
  )
}

export function isReceiptFailed(
  upload: IdentifiableQuickUploadResponse
): boolean {
  return upload.status === QUICK_UPLOAD_STATUS.failed
}

/**
 * The one owner of the quick-upload list cache node: the review queue reads the uploads
 * and the dashboard counts them from the same payload, so the two can never disagree.
 */
export function quickUploadsQueryOptions(userId: UserId) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).ai.quickUploads.list(),
    staleTime: STALE_TIMES.short,
    fetch: async ({
      signal,
    }): Promise<readonly IdentifiableQuickUploadResponse[]> => {
      const response = await api(AIQuickUploadApiFactory).listQuickUploads(
        userId,
        { signal }
      )
      return response.data
    },
    meta: { errorContext: "Receipts could not be loaded" },
  })
}

export function useQuickUploads(userId: UserId) {
  return useQuery(quickUploadsQueryOptions(userId))
}

export function upsertQuickUpload(
  queryClient: QueryClient,
  userId: UserId,
  upload: IdentifiableQuickUploadResponse
): void {
  const listKey = queryKeys.user(userId).ai.quickUploads.list()
  queryClient.setQueryData<readonly IdentifiableQuickUploadResponse[]>(
    listKey,
    (previous) => {
      if (previous === undefined) return [upload]
      const index = previous.findIndex((entry) => entry.id === upload.id)
      if (index === -1) return [...previous, upload]
      return previous.map((entry) =>
        entry.id === upload.id ? { ...entry, ...upload } : entry
      )
    }
  )
}

export interface CreateQuickUploadVariables {
  readonly fileId: FileId
}

export function useCreateQuickUpload(userId: UserId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.user(userId).ai(),
    mutationFn: async (variables: CreateQuickUploadVariables) => {
      const response = await withNormalizedErrors(() =>
        api(AIQuickUploadApiFactory).createQuickUpload(userId, {
          file_id: variables.fileId,
        })
      )
      return response.data
    },
    onSuccess: (upload) => {
      upsertQuickUpload(queryClient, userId, upload)
    },
    meta: { errorContext: "That receipt could not be handed to Myra" },
  })
}

export interface RetryQuickUploadVariables {
  readonly quickUploadId: QuickUploadId
}

export function useRetryQuickUpload(userId: UserId) {
  const queryClient = useQueryClient()
  const listKey = queryKeys.user(userId).ai.quickUploads.list()

  return useMutation(
    optimisticMutationOptions<void, RetryQuickUploadVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).ai(),
      mutationFn: async (variables) => {
        await api(AIQuickUploadApiFactory).retryQuickUpload(
          userId,
          variables.quickUploadId
        )
      },
      updates: [
        {
          queryKey: listKey,
          apply: (client, variables) => {
            client.setQueryData<readonly IdentifiableQuickUploadResponse[]>(
              listKey,
              (previous) =>
                previous?.map((upload) =>
                  upload.id === variables.quickUploadId
                    ? { ...upload, status: QUICK_UPLOAD_STATUS.pending }
                    : upload
                )
            )
          },
        },
      ],
      meta: { errorContext: "That receipt could not be read again" },
    })
  )
}

export interface CompleteQuickUploadVariables {
  readonly quickUploadId: QuickUploadId
  readonly accepted: boolean
}

function withoutUpload(
  previous: readonly IdentifiableQuickUploadResponse[] | undefined,
  quickUploadId: QuickUploadId
): readonly IdentifiableQuickUploadResponse[] | undefined {
  if (previous === undefined) return previous
  return previous.filter((upload) => upload.id !== quickUploadId)
}

export function useCompleteQuickUpload(userId: UserId) {
  const queryClient = useQueryClient()
  const listKey = queryKeys.user(userId).ai.quickUploads.list()

  return useMutation(
    optimisticMutationOptions<void, CompleteQuickUploadVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).ai(),
      mutationFn: async (variables) => {
        await api(AIQuickUploadApiFactory).complete(
          userId,
          variables.quickUploadId,
          { accepted: variables.accepted }
        )
      },
      updates: [
        {
          queryKey: listKey,
          apply: (client, variables) => {
            client.setQueryData<readonly IdentifiableQuickUploadResponse[]>(
              listKey,
              (previous) => withoutUpload(previous, variables.quickUploadId)
            )
          },
        },
      ],
      invalidate: [
        queryKeys.user(userId).transactions.all(),
        queryKeys.user(userId).accounts.all(),
        queryKeys.user(userId).portfolio.all(),
      ],
      meta: { errorContext: "That receipt could not be filed" },
    })
  )
}
