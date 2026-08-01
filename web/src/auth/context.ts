import { createContext, use } from "react"

import type { AuthenticatedAuthSession, AuthSession } from "./types"

export const AuthSessionContext = createContext<AuthSession | null>(null)

export function useAuth(): AuthSession {
  const session = use(AuthSessionContext)
  if (!session) {
    throw new Error("useAuth must be called inside <AuthProvider>")
  }
  return session
}

export function useAuthenticatedSession(): AuthenticatedAuthSession {
  const session = useAuth()
  if (session.status !== "authenticated") {
    throw new Error(
      `An authenticated session is required, but the session is "${session.status}". Render this behind the /_auth route guard.`
    )
  }
  return session
}

export function useUserId(): string {
  return useAuthenticatedSession().userId
}

export function useBaseCurrency(): string {
  const { baseCurrency } = useAuthenticatedSession()
  if (baseCurrency === null) {
    throw new Error(
      "This account has no base currency. Render money figures behind the onboarding guard, or read useAuth().baseCurrency and handle null."
    )
  }
  return baseCurrency
}
