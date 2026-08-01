import type { ReactElement } from "react"
import { useNavigate } from "@tanstack/react-router"

import { getErrorMessage, normalizeError } from "@/lib/errors"
import type { NormalizedError } from "@/lib/errors"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { StateAction } from "@/components/states/state-card"
import {
  DegradedState,
  ErrorState,
  OfflineState,
  WaitingState,
} from "@/components/states/message-state"

import { retryAfterCopy } from "./error-copy"

function detailFor(error: NormalizedError): string | undefined {
  if (error.kind === "serverError" && import.meta.env.DEV) {
    return error.stackTrace ?? error.detail
  }
  return undefined
}

export function ErrorStateFor({
  error,
  onRetry,
  className,
}: {
  error: unknown
  onRetry?: () => void
  className?: string
}): ReactElement {
  const navigate = useNavigate()
  const normalized = normalizeError(error)
  const retry: StateAction[] = onRetry
    ? [{ label: "Try again", kind: "primary", onClick: onRetry }]
    : []
  const detail = detailFor(normalized)
  const shared = { className, actions: retry, ...(detail ? { detail } : {}) }

  if (normalized.kind === "network") {
    if (normalized.reason === "timeout") {
      return (
        <WaitingState
          {...shared}
          headline="Sverto is taking too long"
          body="Nothing was lost. Try again in a moment."
        />
      )
    }
    return (
      <OfflineState
        {...shared}
        headline="Can't reach Sverto"
        body="Your connection dropped or Sverto is unreachable. Nothing has been sent."
      />
    )
  }

  if (normalized.kind === "rateLimited") {
    return (
      <WaitingState
        {...shared}
        headline={
          normalized.source === "ai"
            ? "Myra needs a moment"
            : "Too many attempts at once"
        }
        body={[getErrorMessage(normalized), retryAfterCopy(normalized)]
          .filter(Boolean)
          .join(" ")}
      />
    )
  }

  if (normalized.kind === "serverError") {
    if (normalized.transient) {
      return (
        <DegradedState
          {...shared}
          headline="Sverto is having trouble"
          body="Sverto answered with an error. This is usually temporary — your data is untouched."
        />
      )
    }
    return (
      <ErrorState
        {...shared}
        headline="Something broke on our side"
        body={getErrorMessage(normalized)}
      />
    )
  }

  if (normalized.kind === "unauthorized") {
    return (
      <ErrorState
        {...shared}
        headline="Your session ended"
        body="Sign in again to carry on."
        actions={[
          {
            label: "Sign in",
            kind: "primary",
            onClick: () => {
              void navigate({ to: "/login" })
            },
          },
        ]}
      />
    )
  }

  if (normalized.kind === "forbidden") {
    return (
      <ErrorState
        {...shared}
        headline="You don't have access to this"
        body={getErrorMessage(normalized)}
      />
    )
  }

  if (normalized.kind === "notFound") {
    return (
      <ErrorState
        {...shared}
        headline="Not found"
        body={
          normalized.unrouted
            ? "That address doesn't exist."
            : getErrorMessage(normalized)
        }
      />
    )
  }

  return (
    <ErrorState
      {...shared}
      headline="This didn't load"
      body={getErrorMessage(normalized)}
    />
  )
}

export function RateLimitBanner({
  error,
  onRetry,
  className,
}: {
  error: unknown
  onRetry?: () => void
  className?: string
}) {
  const normalized = normalizeError(error)
  if (normalized.kind !== "rateLimited") return null

  return (
    <div
      role="status"
      data-state="rate-limited"
      className={cn(
        "flex items-start gap-3 rounded-md border border-border-strong bg-surface-2 px-[13px] py-[11px]",
        className
      )}
    >
      <span
        aria-hidden
        className="mt-px flex-none text-[14px] leading-none font-semibold text-attention"
      >
        ◷
      </span>
      <p className="min-w-0 flex-1 text-[12px] leading-[1.5] text-pretty text-ink-2">
        {[getErrorMessage(normalized), retryAfterCopy(normalized)]
          .filter(Boolean)
          .join(" ")}
      </p>
      {onRetry ? (
        <Button
          variant="ghost"
          onClick={onRetry}
          className="h-auto flex-none px-0 text-[11.5px] leading-none font-semibold text-brand hover:bg-transparent"
        >
          Try again
        </Button>
      ) : null}
    </div>
  )
}
