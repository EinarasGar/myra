import { describe, expect, it, vi } from "vitest"

import type { AuthMe } from "@/api"
import type { AuthSession } from "@/auth"
import { authMeQueryOptions } from "@/auth"
import {
  CURRENT_ONBOARDING_VERSION,
  needsOnboarding,
} from "@/components/layout/onboarding"

vi.mock("@/lib/api", () => ({
  api: () => ({}),
  resolveApiUrl: (path: string) => `http://localhost:5000${path}`,
}))

vi.mock("@/lib/env", () => ({
  env: {
    authProvider: "database",
    clerkPublishableKey: "",
    apiBaseUrl: "http://localhost:5000",
  },
}))

const { Route: LoginRoute } = await import("@/routes/login")
const { Route: SignupRoute } = await import("@/routes/signup")
const { Route: OnboardingRoute } = await import("@/routes/_auth/onboarding")
const { Route: ShellRoute } = await import("@/routes/_auth/_shell")
const { Route: AuthRoute } = await import("@/routes/_auth")

function session(isAuthenticated: boolean): AuthSession {
  return isAuthenticated
    ? {
        status: "authenticated",
        isReady: true,
        isAuthenticated: true,
        userId: "u",
        baseCurrency: "GBP",
        signOut: () => Promise.resolve(),
      }
    : {
        status: "unavailable",
        isReady: true,
        isAuthenticated: false,
        userId: null,
        baseCurrency: null,
        error: { kind: "network", reason: "unreachable", message: "boom" },
        retry: () => {},
        signOut: () => Promise.resolve(),
      }
}

function me(overrides: Partial<AuthMe> = {}): AuthMe {
  return {
    user_id: "u",
    onboarding_version: CURRENT_ONBOARDING_VERSION,
    default_asset: { id: 2, ticker: "GBP" },
    role: 1,
    ...overrides,
  } as AuthMe
}

function queryClientWith(data: AuthMe | undefined) {
  return {
    getQueryData: (key: readonly unknown[]) =>
      JSON.stringify(key) === JSON.stringify(authMeQueryOptions().queryKey)
        ? data
        : undefined,
  }
}

function runGuard(
  route: { options: { beforeLoad?: (args: never) => unknown } },
  args: unknown
): { redirectedTo: string | null } {
  try {
    route.options.beforeLoad?.(args as never)
    return { redirectedTo: null }
  } catch (thrown) {
    const target = (thrown as { options?: { to?: string; href?: string } })
      .options
    return { redirectedTo: target?.href ?? target?.to ?? "threw" }
  }
}

describe("/login", () => {
  it("does not bounce an unauthenticated visitor, so a dead API cannot make a redirect loop", () => {
    const inbound = runGuard(AuthRoute, {
      context: { auth: session(false) },
      location: { href: "/" },
    })
    expect(inbound.redirectedTo).toBe("/login")

    const outbound = runGuard(LoginRoute, {
      context: { auth: session(false) },
      search: { redirect: "/" },
    })
    expect(outbound.redirectedTo).toBeNull()
  })

  it("sends an authenticated visitor back to where they were headed", () => {
    expect(
      runGuard(LoginRoute, {
        context: { auth: session(true) },
        search: { redirect: "/portfolio" },
      }).redirectedTo
    ).toBe("/portfolio")
  })

  it("refuses an off-site redirect target", () => {
    expect(
      runGuard(LoginRoute, {
        context: { auth: session(true) },
        search: { redirect: "//evil.example" },
      }).redirectedTo
    ).toBe("/")
  })
})

describe("/signup", () => {
  it("renders for anyone who is not signed in, whatever the provider", () => {
    expect(
      runGuard(SignupRoute, { context: { auth: session(false) } }).redirectedTo
    ).toBeNull()
  })

  it("sends a signed-in visitor to the app", () => {
    expect(
      runGuard(SignupRoute, { context: { auth: session(true) } }).redirectedTo
    ).toBe("/")
  })
})

describe("the onboarding gate", () => {
  it.each([
    ["a missing base currency", me({ default_asset: null })],
    ["an outdated onboarding version", me({ onboarding_version: 0 })],
  ])("sends the shell to /onboarding on %s", (_label, identity) => {
    expect(needsOnboarding(identity)).toBe(true)
    expect(
      runGuard(ShellRoute, {
        context: { queryClient: queryClientWith(identity) },
      }).redirectedTo
    ).toBe("/onboarding")
    expect(
      runGuard(OnboardingRoute, {
        context: { queryClient: queryClientWith(identity) },
      }).redirectedTo
    ).toBeNull()
  })

  it("lets a finished account through and refuses to show the wizard again", () => {
    const identity = me()
    expect(needsOnboarding(identity)).toBe(false)
    expect(
      runGuard(ShellRoute, {
        context: { queryClient: queryClientWith(identity) },
      }).redirectedTo
    ).toBeNull()
    expect(
      runGuard(OnboardingRoute, {
        context: { queryClient: queryClientWith(identity) },
      }).redirectedTo
    ).toBe("/")
  })
})
