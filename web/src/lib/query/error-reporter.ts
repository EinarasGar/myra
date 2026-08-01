import type { MutationKey, QueryKey } from "@tanstack/react-query"

import type { NormalizedError } from "@/lib/errors"

export interface SvertoQueryMeta extends Record<string, unknown> {
  suppressGlobalError?: boolean
  errorContext?: string
}

export interface SvertoMutationMeta extends Record<string, unknown> {
  suppressGlobalError?: boolean
  errorContext?: string
  successMessage?: string
}

export interface ApiErrorEvent {
  error: NormalizedError
  source: "query" | "mutation"
  context?: string
  queryKey?: QueryKey
  mutationKey?: MutationKey
}

export type ApiErrorSubscriber = (event: ApiErrorEvent) => void

const subscribers = new Set<ApiErrorSubscriber>()

export function subscribeToApiErrors(
  subscriber: ApiErrorSubscriber
): () => void {
  subscribers.add(subscriber)
  return () => {
    subscribers.delete(subscriber)
  }
}

export function reportApiError(event: ApiErrorEvent): void {
  for (const subscriber of subscribers) subscriber(event)
}
