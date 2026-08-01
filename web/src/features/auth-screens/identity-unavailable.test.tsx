import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { AuthSession } from "@/auth"

vi.mock("@/lib/api", () => ({
  registerUnauthorizedHandler: () => () => {},
  resolveApiUrl: (path: string) => `http://localhost:5000${path}`,
}))

const envMock = { authProvider: "noauth" }
vi.mock("@/lib/env", () => ({ env: envMock }))

const { AuthSessionScope } = await import("@/auth/session-scope")

function unavailable(): AuthSession {
  return {
    status: "unavailable",
    isReady: true,
    isAuthenticated: false,
    userId: null,
    baseCurrency: null,
    error: {
      kind: "network",
      reason: "unreachable",
      message: "We couldn't reach Sverto. Check your connection.",
    },
    retry: () => {},
    signOut: () => Promise.resolve(),
  }
}

function mount() {
  return render(
    <AuthSessionScope session={unavailable()}>
      <p>the app</p>
    </AuthSessionScope>
  )
}

describe("the unreachable-server state", () => {
  it("replaces the whole app, so no route-level screen can render behind it", () => {
    mount()
    expect(screen.queryByText("the app")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("names the request that failed instead of leaving a developer guessing", () => {
    mount()
    expect(
      screen.getByText("GET http://localhost:5000/api/auth/me")
    ).toBeInTheDocument()
  })

  it("refuses to blame credentials when the build has no credentials", () => {
    mount()
    const card = screen.getByRole("status").closest("[data-slot='state-card']")
    expect(card?.textContent).toContain("Can't reach Sverto")
    expect(card?.textContent).toContain("AUTH_PROVIDER=noauth")
    expect(card?.textContent).toContain("make backend-run")
    expect(card?.textContent).not.toContain("We couldn't load your account")
  })

  it("keeps the account wording for builds that really do sign people in", () => {
    envMock.authProvider = "database"
    mount()
    const card = screen.getByRole("status").closest("[data-slot='state-card']")
    expect(card?.textContent).toContain("We couldn't load your account")
    expect(card?.textContent).not.toContain("AUTH_PROVIDER=noauth")
    envMock.authProvider = "noauth"
  })
})
