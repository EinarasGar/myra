import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useSyncExternalStore } from "react"

import { apiClient } from "@/lib/api"
import type { NormalizedUnauthorizedError } from "@/lib/errors"

import { authMeQueryKey, useAuthMe } from "../auth-me"
import { useAuthSession } from "../session"
import { AuthSessionScope } from "../session-scope"
import { useAuthTransport } from "../transport"
import type { AuthProviderComponent, AuthTokenProvider } from "../types"
import {
  ensureDatabaseRefreshInterceptor,
  getAccessToken,
  isRefreshExhausted,
  signOutFromDatabase,
  subscribeToAccessToken,
} from "./database-session"

export const AuthProvider: AuthProviderComponent = ({ children }) => {
  const queryClient = useQueryClient()
  const accessToken = useSyncExternalStore(
    subscribeToAccessToken,
    getAccessToken
  )

  ensureDatabaseRefreshInterceptor(apiClient)

  const tokenProvider = useMemo<AuthTokenProvider | null>(
    () => (accessToken ? () => Promise.resolve(getAccessToken()) : null),
    [accessToken]
  )
  useAuthTransport(tokenProvider)

  const me = useAuthMe(Boolean(accessToken))

  const signOut = useCallback(async () => {
    await signOutFromDatabase()
    queryClient.removeQueries({ queryKey: authMeQueryKey })
  }, [queryClient])

  const session = useAuthSession({
    isProviderReady: true,
    hasCredential: Boolean(accessToken),
    identity: me,
    signOut,
  })

  const onUnauthorized = useCallback(
    (error: NormalizedUnauthorizedError) => {
      if (!isRefreshExhausted(error)) return
      void signOut()
    },
    [signOut]
  )

  return (
    <AuthSessionScope session={session} onUnauthorized={onUnauthorized}>
      {children}
    </AuthSessionScope>
  )
}
