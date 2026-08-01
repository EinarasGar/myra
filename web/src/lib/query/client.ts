import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"

import type { NormalizedError } from "@/lib/errors"
import { isRetryableError, normalizeError } from "@/lib/errors"

import type { SvertoMutationMeta, SvertoQueryMeta } from "./error-reporter"
import { reportApiError } from "./error-reporter"

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: NormalizedError
    queryMeta: SvertoQueryMeta
    mutationMeta: SvertoMutationMeta
  }
}

export const STALE_TIMES = {
  realtime: 0,
  short: 30_000,
  standard: 5 * 60_000,
  reference: 30 * 60_000,
} as const

const GC_TIME = 10 * 60_000
const MAX_QUERY_RETRIES = 2
const MAX_RETRY_DELAY_MS = 30_000

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        const normalized = normalizeError(error)
        if (normalized.kind === "canceled") return
        if (query.meta?.suppressGlobalError === true) return
        reportApiError({
          error: normalized,
          source: "query",
          queryKey: query.queryKey,
          ...(query.meta?.errorContext === undefined
            ? {}
            : { context: query.meta.errorContext }),
        })
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        const normalized = normalizeError(error)
        if (normalized.kind === "canceled") return
        if (mutation.meta?.suppressGlobalError === true) return
        reportApiError({
          error: normalized,
          source: "mutation",
          ...(mutation.options.mutationKey === undefined
            ? {}
            : { mutationKey: mutation.options.mutationKey }),
          ...(mutation.meta?.errorContext === undefined
            ? {}
            : { context: mutation.meta.errorContext }),
        })
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.short,
        gcTime: GC_TIME,
        retry: (failureCount, error) =>
          failureCount < MAX_QUERY_RETRIES &&
          isRetryableError(normalizeError(error)),
        retryDelay: retryDelay,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()

function retryDelay(attemptIndex: number): number {
  const backoff = Math.min(1_000 * 2 ** attemptIndex, MAX_RETRY_DELAY_MS)
  return backoff / 2 + Math.random() * (backoff / 2)
}
