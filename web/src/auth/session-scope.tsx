import { useEffect, type ReactNode } from "react"

import { registerUnauthorizedHandler, resolveApiUrl } from "@/lib/api"
import { env } from "@/lib/env"
import { getErrorMessage, normalizeError } from "@/lib/errors"
import type { NormalizedUnauthorizedError } from "@/lib/errors"
import {
  DegradedState,
  ErrorState,
  OfflineState,
} from "@/components/states/message-state"

import { AuthSessionContext } from "./context"
import type { AuthSession, UnavailableAuthSession } from "./types"

export function AuthSessionScope({
  session,
  onUnauthorized,
  children,
}: {
  session: AuthSession
  onUnauthorized?: (error: NormalizedUnauthorizedError) => void
  children: ReactNode
}) {
  const isAuthenticated = session.isAuthenticated

  useEffect(() => {
    if (!onUnauthorized || !isAuthenticated) return
    return registerUnauthorizedHandler(onUnauthorized)
  }, [onUnauthorized, isAuthenticated])

  return (
    <AuthSessionContext value={session}>
      {session.status === "unavailable" ? (
        <IdentityUnavailable session={session} />
      ) : (
        children
      )}
    </AuthSessionContext>
  )
}

const NOAUTH_FOOTNOTE =
  "This build runs AUTH_PROVIDER=noauth, so this is not a credential problem — the API itself did not answer. Start it with make backend-run."

const IDENTITY_FOOTNOTE =
  "Sverto can't show anything until it knows whose ledger to open."

function IdentityUnavailable({ session }: { session: UnavailableAuthSession }) {
  const error = normalizeError(session.error)
  const State =
    error.kind === "network"
      ? OfflineState
      : error.kind === "serverError" && error.transient
        ? DegradedState
        : ErrorState
  const noauth = env.authProvider === "noauth"

  return (
    <div
      data-slot="identity-unavailable"
      className="flex min-h-svh items-center justify-center bg-background px-5 py-10"
    >
      <State
        className="w-full max-w-[420px]"
        headline={
          noauth ? "Can't reach Sverto" : "We couldn't load your account"
        }
        body={getErrorMessage(error)}
        detail={`GET ${resolveApiUrl("/api/auth/me")}`}
        actions={[
          { label: "Try again", kind: "primary", onClick: session.retry },
        ]}
        footnote={noauth ? NOAUTH_FOOTNOTE : IDENTITY_FOOTNOTE}
      />
    </div>
  )
}
