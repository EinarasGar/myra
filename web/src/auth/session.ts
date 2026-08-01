import { useEffect, useMemo, useState } from "react"

import type { AuthMe } from "@/api"
import type { NormalizedNetworkError } from "@/lib/errors"

import { AUTH_TOKEN_DEADLINE_MS } from "./tokens"
import type { AuthSession } from "./types"

export const PROVIDER_READY_DEADLINE_MS = AUTH_TOKEN_DEADLINE_MS

const PROVIDER_UNREACHABLE: NormalizedNetworkError = {
  kind: "network",
  reason: "unreachable",
  message: "We couldn't reach the sign-in service. Check your connection.",
}

export interface IdentityQuery {
  data: AuthMe | undefined
  isError: boolean
  error: unknown
  refetch: () => void
}

export interface AuthSessionInputs {
  isProviderReady: boolean
  hasCredential: boolean
  identity: IdentityQuery
  signOut: () => Promise<void>
  isProviderStalled?: boolean
}

export function buildAuthSession({
  isProviderReady,
  hasCredential,
  identity,
  signOut,
  isProviderStalled = false,
}: AuthSessionInputs): AuthSession {
  const pending = {
    status: "loading",
    isReady: false,
    isAuthenticated: false,
    userId: null,
    baseCurrency: null,
    signOut,
  } as const

  if (!isProviderReady) {
    if (!isProviderStalled) return pending
    return {
      status: "unavailable",
      isReady: true,
      isAuthenticated: false,
      userId: null,
      baseCurrency: null,
      error: PROVIDER_UNREACHABLE,
      retry: () => {
        window.location.reload()
      },
      signOut,
    }
  }

  if (!hasCredential) {
    return {
      status: "anonymous",
      isReady: true,
      isAuthenticated: false,
      userId: null,
      baseCurrency: null,
      signOut,
    }
  }

  if (identity.data) {
    return {
      status: "authenticated",
      isReady: true,
      isAuthenticated: true,
      userId: identity.data.user_id,
      baseCurrency: identity.data.default_asset?.ticker ?? null,
      signOut,
    }
  }

  if (identity.isError) {
    return {
      status: "unavailable",
      isReady: true,
      isAuthenticated: false,
      userId: null,
      baseCurrency: null,
      error: identity.error,
      retry: identity.refetch,
      signOut,
    }
  }

  return pending
}

export function useAuthSession({
  isProviderReady,
  hasCredential,
  identity,
  signOut,
}: AuthSessionInputs): AuthSession {
  const { data, isError, error, refetch } = identity
  const isProviderStalled = useStalled(!isProviderReady)

  return useMemo(
    () =>
      buildAuthSession({
        isProviderReady,
        hasCredential,
        identity: { data, isError, error, refetch },
        signOut,
        isProviderStalled,
      }),
    [
      isProviderReady,
      hasCredential,
      data,
      isError,
      error,
      refetch,
      signOut,
      isProviderStalled,
    ]
  )
}

function useStalled(isPending: boolean): boolean {
  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    if (!isPending) return
    const timer = setTimeout(() => setStalled(true), PROVIDER_READY_DEADLINE_MS)
    return () => {
      clearTimeout(timer)
      setStalled(false)
    }
  }, [isPending])

  return isPending && stalled
}
