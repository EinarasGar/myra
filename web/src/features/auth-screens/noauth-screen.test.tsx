import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", () => ({
  api: () => ({}),
  resolveApiUrl: (path: string) => `http://localhost:5000${path}`,
}))

vi.mock("@/lib/env", () => ({
  env: {
    authProvider: "noauth",
    clerkPublishableKey: "",
    apiBaseUrl: "http://localhost:5000",
  },
}))

const { SignInScreen, SignUpScreen } = await import("./auth-screen")
const { Route: LoginRoute } = await import("@/routes/login")
const { authenticatedSession, renderInShell, stubViewport, VIEWPORTS } =
  await import("@/features/onboarding/test-harness")

beforeEach(() => {
  stubViewport(VIEWPORTS.full)
})

describe("the noauth sign-in screen", () => {
  it("explains why there is no form instead of showing an empty one", async () => {
    await renderInShell(<SignInScreen />, {
      session: authenticatedSession("GBP"),
      initialPath: "/login",
    })

    expect(
      screen.getByRole("heading", { name: "There is no sign-in on this build" })
    ).toBeInTheDocument()
    expect(screen.getByText(/AUTH_PROVIDER=noauth/)).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("always leaves a way into the app", async () => {
    await renderInShell(<SignInScreen />, {
      session: authenticatedSession("GBP"),
      initialPath: "/login",
    })

    expect(screen.getByRole("link", { name: "Open Sverto" })).toHaveAttribute(
      "href",
      "/"
    )
  })

  it("stays on /login instead of bouncing, because noauth authenticates everyone", () => {
    let redirected = false
    try {
      ;(
        LoginRoute.options.beforeLoad as ((args: unknown) => void) | undefined
      )?.({
        context: { auth: { isAuthenticated: true } },
        search: {},
      })
    } catch {
      redirected = true
    }
    expect(redirected).toBe(false)
  })

  it("shows the same explanation on the sign-up route", async () => {
    await renderInShell(<SignUpScreen />, {
      session: authenticatedSession("GBP"),
      initialPath: "/signup",
    })

    expect(
      screen.getByRole("heading", { name: "There is no sign-in on this build" })
    ).toBeInTheDocument()
  })
})
