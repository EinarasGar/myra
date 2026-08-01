import type { ComponentType, ReactNode } from "react"

export type AuthStatus =
  "loading" | "anonymous" | "unavailable" | "authenticated"

interface AuthSessionShared {
  signOut: () => Promise<void>
}

export interface LoadingAuthSession extends AuthSessionShared {
  status: "loading"
  isReady: false
  isAuthenticated: false
  userId: null
  baseCurrency: null
}

export interface AnonymousAuthSession extends AuthSessionShared {
  status: "anonymous"
  isReady: true
  isAuthenticated: false
  userId: null
  baseCurrency: null
}

export interface UnavailableAuthSession extends AuthSessionShared {
  status: "unavailable"
  isReady: true
  isAuthenticated: false
  userId: null
  baseCurrency: null
  error: unknown
  retry: () => void
}

export interface AuthenticatedAuthSession extends AuthSessionShared {
  status: "authenticated"
  isReady: true
  isAuthenticated: true
  userId: string
  baseCurrency: string | null
}

export type AuthSession =
  | LoadingAuthSession
  | AnonymousAuthSession
  | UnavailableAuthSession
  | AuthenticatedAuthSession

export type AuthProviderComponent = ComponentType<{ children: ReactNode }>

export type AuthTokenProvider = () => Promise<string | null>
