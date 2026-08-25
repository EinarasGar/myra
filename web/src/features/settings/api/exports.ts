import { useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { ExportFormat, IdentifiableExport } from "@/api"
import { ExportsApiFactory, FilesApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { UserId } from "@/lib/query"
import {
  apiQueryOptions,
  mutationKeys,
  optimisticMutationOptions,
  queryKeys,
} from "@/lib/query"

export interface CreateExportVariables {
  format: ExportFormat
}

export function exportsQueryOptions(userId: UserId) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).exports.list(),
    fetch: async ({ signal }): Promise<IdentifiableExport[]> => {
      const response = await api(ExportsApiFactory).listExports(userId, {
        signal,
      })
      return response.data.exports
    },
    meta: { errorContext: "Your exports could not be loaded" },
  })
}

export function useExports(userId: UserId) {
  return useQuery(exportsQueryOptions(userId))
}

export function useCreateExport(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<IdentifiableExport, CreateExportVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).exports(),
      mutationFn: async ({ format }) => {
        const response = await api(ExportsApiFactory).createExport(userId, {
          format,
        })
        return response.data
      },
      updates: [],
      invalidate: [
        queryKeys.user(userId).exports.list(),
        queryKeys.user(userId).exports.all(),
      ],
      meta: { errorContext: "The export could not be created" },
    })
  )
}

export function useExportDownload(userId: UserId) {
  return useCallback(
    async (exportRow: IdentifiableExport): Promise<void> => {
      const response = await api(FilesApiFactory).getFileUrl(
        userId,
        exportRow.id
      )
      window.location.assign(response.data.url)
    },
    [userId]
  )
}
