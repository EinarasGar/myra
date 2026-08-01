import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const clerkState = { isLoaded: true, isSignedIn: false }

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => clerkState,
  SignIn: (props: { signUpUrl?: string; fallbackRedirectUrl?: string }) => (
    <div data-testid="clerk-sign-in" data-sign-up-url={props.signUpUrl}>
      Clerk sign-in flow
    </div>
  ),
  SignUp: (props: { signInUrl?: string }) => (
    <div data-testid="clerk-sign-up" data-sign-in-url={props.signInUrl}>
      Clerk sign-up flow
    </div>
  ),
}))

vi.mock("@/lib/api", () => ({
  api: () => ({}),
  resolveApiUrl: (path: string) => `http://localhost:5000${path}`,
}))

vi.mock("@/lib/env", () => ({
  env: {
    authProvider: "clerk",
    clerkPublishableKey: "pk_test_key",
    apiBaseUrl: "http://localhost:5000",
  },
}))

const { SignInScreen, SignUpScreen } = await import("./auth-screen")
const { anonymousSession, renderInShell, stubViewport, VIEWPORTS } =
  await import("@/features/onboarding/test-harness")

beforeEach(() => {
  stubViewport(VIEWPORTS.full)
  clerkState.isLoaded = true
  clerkState.isSignedIn = false
})

describe("the clerk sign-in screen", () => {
  it("renders Clerk's flow inside the Sverto shell, not on a bare page", async () => {
    await renderInShell(<SignInScreen />, {
      session: anonymousSession(),
      initialPath: "/login",
    })

    const flow = await screen.findByTestId("clerk-sign-in")
    expect(flow).toBeInTheDocument()
    expect(flow.dataset.signUpUrl).toBe("/signup")
    expect(screen.getByText("Welcome back")).toBeInTheDocument()
    expect(
      screen.getByText(/Sign-in is handled by Clerk for this instance/)
    ).toBeInTheDocument()
  })

  it("never renders a Sverto password field under clerk", async () => {
    await renderInShell(<SignInScreen />, {
      session: anonymousSession(),
      initialPath: "/login",
    })

    await screen.findByTestId("clerk-sign-in")
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument()
  })

  it("waits for Clerk rather than flashing an empty form", async () => {
    clerkState.isLoaded = false
    await renderInShell(<SignInScreen />, {
      session: anonymousSession(),
      initialPath: "/login",
    })

    expect(
      await screen.findByText("Loading the sign-in form…")
    ).toBeInTheDocument()
    expect(screen.queryByTestId("clerk-sign-in")).not.toBeInTheDocument()
  })

  it("says a Clerk session exists while Sverto is still fetching the account", async () => {
    clerkState.isSignedIn = true
    await renderInShell(<SignInScreen />, {
      session: anonymousSession(),
      initialPath: "/login",
    })

    expect(await screen.findByText("You're signed in")).toBeInTheDocument()
  })

  it("renders Clerk's sign-up flow on the sign-up route", async () => {
    await renderInShell(<SignUpScreen />, {
      session: anonymousSession(),
      initialPath: "/signup",
    })

    const flow = await screen.findByTestId("clerk-sign-up")
    expect(flow.dataset.signInUrl).toBe("/login")
  })
})
