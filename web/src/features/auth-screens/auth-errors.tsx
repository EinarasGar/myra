import type { ReactElement } from "react"

import { resolveApiUrl } from "@/lib/api"
import { normalizeError } from "@/lib/errors"
import { ErrorStateFor } from "@/components/layout/error-states"
import { ErrorState, OfflineState } from "@/components/states/message-state"
import type { StateAction } from "@/components/states/state-card"

import {
  NO_PASSWORD_AUTH_BODY,
  NO_PASSWORD_AUTH_HEADLINE,
  NO_SIGN_UP_BODY,
  NO_SIGN_UP_HEADLINE,
  SERVER_UNREACHABLE_BODY,
  SERVER_UNREACHABLE_HEADLINE,
  SIGN_IN_FAILED_BODY,
  SIGN_IN_FAILED_HEADLINE,
  SIGN_IN_FAILED_LOCKOUT_NOTE,
} from "./copy"

const NETWORK_REASONS: Record<string, string> = {
  offline: "the browser reports no network connection",
  timeout: "it took too long to answer",
  unreachable: "the connection was refused or dropped",
}

export type AuthEndpoint = "sign-in" | "sign-up"

const MISSING_ENDPOINT = {
  "sign-in": {
    headline: NO_PASSWORD_AUTH_HEADLINE,
    body: NO_PASSWORD_AUTH_BODY,
  },
  "sign-up": { headline: NO_SIGN_UP_HEADLINE, body: NO_SIGN_UP_BODY },
} as const

export function AuthFailureState({
  error,
  endpoint,
  path,
  onRetry,
}: {
  error: unknown
  endpoint: AuthEndpoint
  path: string
  onRetry?: () => void
}): ReactElement | null {
  const normalized = normalizeError(error)
  if (normalized.kind === "canceled") return null

  const retry: readonly StateAction[] = onRetry
    ? [{ label: "Try again", kind: "primary", onClick: onRetry }]
    : []

  if (normalized.kind === "unauthorized") {
    return (
      <ErrorState
        data-slot="auth-failure"
        headline={SIGN_IN_FAILED_HEADLINE}
        body={SIGN_IN_FAILED_BODY}
        actions={retry}
        footnote={SIGN_IN_FAILED_LOCKOUT_NOTE}
      />
    )
  }

  if (normalized.kind === "notFound") {
    const copy = MISSING_ENDPOINT[endpoint]
    return (
      <ErrorState
        data-slot="auth-failure"
        headline={copy.headline}
        body={copy.body}
        detail={`POST ${resolveApiUrl(path)} · 404`}
        actions={retry}
      />
    )
  }

  if (normalized.kind === "network") {
    return (
      <OfflineState
        data-slot="auth-failure"
        headline={SERVER_UNREACHABLE_HEADLINE}
        body={SERVER_UNREACHABLE_BODY}
        detail={`POST ${resolveApiUrl(path)} · ${NETWORK_REASONS[normalized.reason] ?? normalized.message}`}
        actions={retry}
      />
    )
  }

  return (
    <div data-slot="auth-failure">
      <ErrorStateFor error={normalized} {...(onRetry ? { onRetry } : {})} />
    </div>
  )
}
