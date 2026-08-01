import type {
  MutationKey,
  QueryClient,
  QueryKey,
  UseMutationOptions,
} from "@tanstack/react-query"

import type { NormalizedError } from "@/lib/errors"
import type { SvertoMutationMeta } from "@/lib/query"
import { withNormalizedErrors } from "@/lib/query"

export interface PrefixOptimisticContext {
  snapshots: Array<[QueryKey, unknown]>
}

export interface PrefixOptimisticConfig<TData, TVariables> {
  queryClient: QueryClient
  mutationKey: MutationKey
  mutationFn: (variables: TVariables) => Promise<TData>
  prefixes: QueryKey[]
  apply: (previous: unknown, variables: TVariables) => unknown
  invalidate?: QueryKey[]
  meta?: SvertoMutationMeta
}

/**
 * `optimisticUpdate` from @/lib/query addresses one exact key. A ledger write has to reach
 * every cached page of every filter variant, which is only knowable by prefix match, so
 * the snapshot/rollback pair here works over `getQueriesData` instead.
 */
export function prefixOptimisticMutationOptions<TData, TVariables>(
  config: PrefixOptimisticConfig<TData, TVariables>
): UseMutationOptions<
  TData,
  NormalizedError,
  TVariables,
  PrefixOptimisticContext
> {
  const { queryClient, mutationKey, prefixes } = config
  const invalidationKeys = [...prefixes, ...(config.invalidate ?? [])]

  return {
    mutationKey,
    mutationFn: (variables) =>
      withNormalizedErrors(() => config.mutationFn(variables)),
    ...(config.meta === undefined ? {} : { meta: config.meta }),
    onMutate: async (variables) => {
      await Promise.all(
        prefixes.map((queryKey) => queryClient.cancelQueries({ queryKey }))
      )

      const snapshots: Array<[QueryKey, unknown]> = []
      for (const queryKey of prefixes) {
        for (const [key, data] of queryClient.getQueriesData({ queryKey })) {
          snapshots.push([key, data])
          queryClient.setQueryData(key, config.apply(data, variables))
        }
      }

      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, previous] of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, previous)
      }
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) > 1) return
      for (const queryKey of invalidationKeys) {
        void queryClient.invalidateQueries({ queryKey })
      }
    },
  }
}
