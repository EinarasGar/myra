import { act, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthMe } from "@/api"
import { notifyUnauthorized } from "@/lib/api/credentials"
import type { NormalizedUnauthorizedError } from "@/lib/errors"

import { AuthSessionContext, useBaseCurrency, useUserId } from "./context"
import {
  buildAuthSession,
  PROVIDER_READY_DEADLINE_MS,
  useAuthSession,
  type IdentityQuery,
} from "./session"
import { AuthSessionScope } from "./session-scope"
import type { AuthSession } from "./types"

const ME: AuthMe = {
  user_id: "00000000-0000-0000-0000-000000000000",
  onboarding_version: 1,
  role: "user",
  default_asset: { id: 1, ticker: "GBP" },
}

const UNAUTHORIZED: NormalizedUnauthorizedError = {
  kind: "unauthorized",
  message: "Unauthorized",
}

const signOut = () => Promise.resolve()

function identityOf(patch: Partial<IdentityQuery> = {}): IdentityQuery {
  return {
    data: undefined,
    isError: false,
    error: null,
    refetch: () => {},
    ...patch,
  }
}

function sessionOf(
  hasCredential: boolean,
  identity: IdentityQuery,
  isProviderReady = true
): AuthSession {
  return buildAuthSession({
    isProviderReady,
    hasCredential,
    identity,
    signOut,
  })
}

describe("buildAuthSession", () => {
  it("never reports an authenticated session without a user id", () => {
    const identities = [
      identityOf(),
      identityOf({ isError: true, error: new Error("backend down") }),
      identityOf({ data: ME }),
      identityOf({ data: ME, isError: true, error: new Error("refetch") }),
    ]

    for (const isProviderReady of [false, true]) {
      for (const hasCredential of [false, true]) {
        for (const identity of identities) {
          const session = sessionOf(hasCredential, identity, isProviderReady)

          if (session.isReady && session.isAuthenticated) {
            expect(session.userId).toEqual(expect.any(String))
          }
          if (session.userId !== null) {
            expect(session.status).toBe("authenticated")
          }
        }
      }
    }
  })

  it("reports identity as unavailable rather than authenticated when /auth/me fails", () => {
    const session = sessionOf(
      true,
      identityOf({ isError: true, error: new Error("502") })
    )

    expect(session.status).toBe("unavailable")
    expect(session.isReady).toBe(true)
    expect(session.isAuthenticated).toBe(false)
    expect(session.userId).toBeNull()
  })

  it("keeps a resolved identity when a background refetch fails", () => {
    const session = sessionOf(
      true,
      identityOf({ data: ME, isError: true, error: new Error("502") })
    )

    expect(session.status).toBe("authenticated")
    expect(session.userId).toBe(ME.user_id)
  })

  it("stays loading until the provider has decided", () => {
    const session = sessionOf(true, identityOf({ data: ME }), false)

    expect(session.status).toBe("loading")
    expect(session.isReady).toBe(false)
  })

  it("stops waiting for a sign-in provider that never loads", () => {
    const session = buildAuthSession({
      isProviderReady: false,
      hasCredential: false,
      identity: identityOf(),
      signOut,
      isProviderStalled: true,
    })

    expect(session.status).toBe("unavailable")
    expect(session.isAuthenticated).toBe(false)
  })

  it("is anonymous without a credential even when an identity is cached", () => {
    const session = sessionOf(false, identityOf({ data: ME }))

    expect(session.status).toBe("anonymous")
    expect(session.isReady).toBe(true)
    expect(session.userId).toBeNull()
  })

  it("exposes the base currency ticker, and null when the account has none", () => {
    expect(sessionOf(true, identityOf({ data: ME })).baseCurrency).toBe("GBP")
    expect(
      sessionOf(true, identityOf({ data: { ...ME, default_asset: null } }))
        .baseCurrency
    ).toBeNull()
  })
})

describe("useAuthSession", () => {
  it("turns an endless wait for the sign-in provider into a recoverable failure", () => {
    vi.useFakeTimers()
    try {
      const { result, rerender } = renderHook(
        (isProviderReady: boolean) =>
          useAuthSession({
            isProviderReady,
            hasCredential: false,
            identity: identityOf(),
            signOut,
          }),
        { initialProps: false }
      )

      expect(result.current.status).toBe("loading")

      act(() => {
        vi.advanceTimersByTime(PROVIDER_READY_DEADLINE_MS)
      })
      expect(result.current.status).toBe("unavailable")

      rerender(true)
      expect(result.current.status).toBe("anonymous")
    } finally {
      vi.useRealTimers()
    }
  })
})

describe("AuthSessionScope", () => {
  function Screen() {
    return <p>user {useUserId()}</p>
  }

  it("renders the app once identity resolves", () => {
    render(
      <AuthSessionScope session={sessionOf(true, identityOf({ data: ME }))}>
        <Screen />
      </AuthSessionScope>
    )

    expect(screen.getByText(`user ${ME.user_id}`)).toBeInTheDocument()
  })

  it("replaces the app with a recoverable error when identity is unavailable", async () => {
    const retry = vi.fn()
    const session = sessionOf(
      true,
      identityOf({ isError: true, error: new Error("502"), refetch: retry })
    )

    render(
      <AuthSessionScope session={session}>
        <Screen />
      </AuthSessionScope>
    )

    expect(screen.queryByText(/^user /)).not.toBeInTheDocument()
    expect(screen.getByText("Can't reach Sverto")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it("routes a server 401 to the provider's sign-out policy", () => {
    const onUnauthorized = vi.fn()
    render(
      <AuthSessionScope
        session={sessionOf(true, identityOf({ data: ME }))}
        onUnauthorized={onUnauthorized}
      >
        <p>app</p>
      </AuthSessionScope>
    )

    notifyUnauthorized(UNAUTHORIZED)
    expect(onUnauthorized).toHaveBeenCalledWith(UNAUTHORIZED)
  })

  it("stops listening for 401s once the session is no longer authenticated", () => {
    const onUnauthorized = vi.fn()
    const view = render(
      <AuthSessionScope
        session={sessionOf(true, identityOf({ data: ME }))}
        onUnauthorized={onUnauthorized}
      >
        <p>app</p>
      </AuthSessionScope>
    )

    view.rerender(
      <AuthSessionScope
        session={sessionOf(false, identityOf())}
        onUnauthorized={onUnauthorized}
      >
        <p>app</p>
      </AuthSessionScope>
    )

    notifyUnauthorized(UNAUTHORIZED)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})

describe("identity hooks", () => {
  function wrapperFor(session: AuthSession) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return <AuthSessionContext value={session}>{children}</AuthSessionContext>
    }
  }

  it("returns the identity of a resolved session", () => {
    const wrapper = wrapperFor(sessionOf(true, identityOf({ data: ME })))

    expect(renderHook(() => useUserId(), { wrapper }).result.current).toBe(
      ME.user_id
    )
    expect(
      renderHook(() => useBaseCurrency(), { wrapper }).result.current
    ).toBe("GBP")
  })

  it("refuses to invent an identity when the session is not authenticated", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = wrapperFor(
      sessionOf(true, identityOf({ isError: true, error: new Error("502") }))
    )

    expect(() => renderHook(() => useUserId(), { wrapper })).toThrow(
      /session is "unavailable"/
    )
  })

  it("refuses to render money for an account with no base currency", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = wrapperFor(
      sessionOf(true, identityOf({ data: { ...ME, default_asset: null } }))
    )

    expect(() => renderHook(() => useBaseCurrency(), { wrapper })).toThrow(
      /no base currency/
    )
  })
})
