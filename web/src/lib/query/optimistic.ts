import type {
  MutationKey,
  QueryClient,
  QueryKey,
  UseMutationOptions,
} from "@tanstack/react-query"

import type { NormalizedError } from "@/lib/errors"

import type { SvertoMutationMeta } from "./error-reporter"
import { withNormalizedErrors } from "./queries"

export interface OptimisticUpdate<TVariables> {
  queryKey: QueryKey
  apply: (queryClient: QueryClient, variables: TVariables) => void
}

export interface OptimisticContext {
  snapshots: Array<[QueryKey, unknown]>
}

export interface OptimisticMutationConfig<TData, TVariables> {
  queryClient: QueryClient
  mutationKey: MutationKey
  mutationFn: (variables: TVariables) => Promise<TData>
  updates: Array<OptimisticUpdate<TVariables>>
  invalidate?: QueryKey[]
  meta?: SvertoMutationMeta
}

export function optimisticUpdate<TCache, TVariables>(
  queryKey: QueryKey,
  updater: (
    previous: TCache | undefined,
    variables: TVariables
  ) => TCache | undefined
): OptimisticUpdate<TVariables> {
  return {
    queryKey,
    apply: (queryClient, variables) => {
      queryClient.setQueryData<TCache>(queryKey, (previous) =>
        updater(previous, variables)
      )
    },
  }
}

export function optimisticMutationOptions<TData, TVariables>(
  config: OptimisticMutationConfig<TData, TVariables>
): UseMutationOptions<TData, NormalizedError, TVariables, OptimisticContext> {
  const { queryClient, mutationKey, updates } = config
  const invalidationKeys = [
    ...updates.map((update) => update.queryKey),
    ...(config.invalidate ?? []),
  ]

  return {
    mutationKey,
    mutationFn: (variables) =>
      withNormalizedErrors(() => config.mutationFn(variables)),
    ...(config.meta === undefined ? {} : { meta: config.meta }),
    onMutate: async (variables) => {
      await Promise.all(
        updates.map((update) =>
          queryClient.cancelQueries({ queryKey: update.queryKey })
        )
      )

      const snapshots = updates.map((update): [QueryKey, unknown] => [
        update.queryKey,
        queryClient.getQueryData(update.queryKey),
      ])

      for (const update of updates) update.apply(queryClient, variables)

      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, previous] of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, previous)
      }
    },
    // Invalidating only once the last concurrent mutation of this group settles keeps
    // rapid inline edits from thrashing the list they are editing.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) > 1) return
      for (const queryKey of invalidationKeys) {
        void queryClient.invalidateQueries({ queryKey })
      }
    },
  }
}
