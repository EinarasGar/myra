import { queryOptions, useQuery } from "@tanstack/react-query"

import { AuthenticationApiFactory, type AuthMe } from "@/api"
import { api } from "@/lib/api"
import { queryKeys, STALE_TIMES } from "@/lib/query"

export const authMeQueryKey = queryKeys.auth.me()

export function authMeQueryOptions() {
  return queryOptions({
    queryKey: authMeQueryKey,
    queryFn: async ({ signal }): Promise<AuthMe> => {
      const response = await api(AuthenticationApiFactory).getMe({ signal })
      return response.data
    },
    staleTime: STALE_TIMES.standard,
  })
}

export function useAuthMe(enabled: boolean) {
  return useQuery({ ...authMeQueryOptions(), enabled })
}
