import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, type ReactNode } from "react"

import { env } from "@/lib/env"

import { authMeQueryKey, useAuthMe } from "../auth-me"
import { useAuthSession } from "../session"
import { AuthSessionScope } from "../session-scope"
import { useAuthTransport } from "../transport"
import type { AuthProviderComponent, AuthTokenProvider } from "../types"

export const AuthProvider: AuthProviderComponent = ({ children }) => (
  <ClerkProvider publishableKey={env.clerkPublishableKey} afterSignOutUrl="/">
    <ClerkSessionBridge>{children}</ClerkSessionBridge>
  </ClerkProvider>
)

function ClerkSessionBridge({ children }: { children: ReactNode }) {
  const clerk = useClerkAuth()
  const queryClient = useQueryClient()
  const isSignedIn = clerk.isSignedIn === true

  const { getToken, signOut: clerkSignOut } = clerk
  const tokenProvider = useMemo<AuthTokenProvider | null | undefined>(() => {
    if (!clerk.isLoaded) return undefined
    if (!isSignedIn) return null
    return () => getToken()
  }, [clerk.isLoaded, isSignedIn, getToken])

  useAuthTransport(tokenProvider)

  const me = useAuthMe(clerk.isLoaded && isSignedIn)

  const signOut = useCallback(async () => {
    await clerkSignOut()
    queryClient.removeQueries({ queryKey: authMeQueryKey })
  }, [clerkSignOut, queryClient])

  const session = useAuthSession({
    isProviderReady: clerk.isLoaded,
    hasCredential: isSignedIn,
    identity: me,
    signOut,
  })

  const onUnauthorized = useCallback(() => {
    void signOut()
  }, [signOut])

  return (
    <AuthSessionScope session={session} onUnauthorized={onUnauthorized}>
      {children}
    </AuthSessionScope>
  )
}
