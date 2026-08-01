import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { NormalizedError } from "@/lib/errors"

const signInWithPassword = vi.fn()
const postUser = vi.fn()

vi.mock("@/lib/api", () => ({
  api: () => ({ postUser }),
  resolveApiUrl: (path: string) => `http://localhost:5000${path}`,
}))

vi.mock("@/auth/impl/database-session", () => ({ signInWithPassword }))

vi.mock("@/lib/env", () => ({
  env: {
    authProvider: "database",
    clerkPublishableKey: "",
    apiBaseUrl: "http://localhost:5000",
  },
}))

const { SignInScreen, SignUpScreen } = await import("./auth-screen")
const { anonymousSession, renderInShell, stubViewport, VIEWPORTS } =
  await import("@/features/onboarding/test-harness")

function normalized(error: NormalizedError): NormalizedError {
  return error
}

async function mountSignIn() {
  return renderInShell(<SignInScreen />, {
    session: anonymousSession(),
    initialPath: "/login",
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubViewport(VIEWPORTS.full)
  signInWithPassword.mockResolvedValue(undefined)
  postUser.mockResolvedValue({ data: {} })
})

describe("the database sign-in screen", () => {
  it("posts the credentials through the auth layer, not its own request", async () => {
    const user = userEvent.setup()
    await mountSignIn()

    await user.type(screen.getByLabelText("Username"), "einaras")
    await user.type(screen.getByLabelText("Password"), "hunter2hunter2")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        username: "einaras",
        password: "hunter2hunter2",
      })
    )
  })

  it("refuses to submit an empty form and says why", async () => {
    const user = userEvent.setup()
    await mountSignIn()

    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(
      screen.getByText("Fill in both a username and a password to sign in.")
    ).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it("names the wrong credentials without leaking whether the account exists", async () => {
    signInWithPassword.mockRejectedValue(
      normalized({ kind: "unauthorized", message: "Unauthorized", status: 401 })
    )
    const user = userEvent.setup()
    await mountSignIn()

    await user.type(screen.getByLabelText("Username"), "einaras")
    await user.type(screen.getByLabelText("Password"), "wrong")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain(
      "That username and password don't match"
    )
    expect(alert.textContent).toContain(
      "does not say whether the username exists"
    )
    expect(alert.textContent).not.toMatch(/five failed attempts|Reset password/)
  })

  it("blames the network, not the credentials, when the server never answered", async () => {
    signInWithPassword.mockRejectedValue(
      normalized({
        kind: "network",
        reason: "unreachable",
        message: "Network Error",
      })
    )
    const user = userEvent.setup()
    await mountSignIn()

    await user.type(screen.getByLabelText("Username"), "einaras")
    await user.type(screen.getByLabelText("Password"), "hunter2hunter2")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    const status = await screen.findByRole("status")
    expect(status.textContent).toContain("Can't reach Sverto")
    expect(status.textContent).toContain(
      "POST http://localhost:5000/api/auth · the connection was refused or dropped"
    )
  })

  it("explains the 404 the server returns when it was built without password auth", async () => {
    signInWithPassword.mockRejectedValue(
      normalized({
        kind: "notFound",
        unrouted: true,
        message: "Not Found",
        status: 404,
      })
    )
    const user = userEvent.setup()
    await mountSignIn()

    await user.type(screen.getByLabelText("Username"), "einaras")
    await user.type(screen.getByLabelText("Password"), "hunter2hunter2")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain(
      "Password sign-in is not available here"
    )
    expect(alert.textContent).toContain("built without password sign-in")
  })

  it("attaches a 422 field error to the field it names", async () => {
    signInWithPassword.mockRejectedValue(
      normalized({
        kind: "validation",
        message: "Validation failed",
        status: 422,
        fieldErrors: [{ field: "username", message: "Unknown user." }],
      })
    )
    const user = userEvent.setup()
    await mountSignIn()

    await user.type(screen.getByLabelText("Username"), "einaras")
    await user.type(screen.getByLabelText("Password"), "hunter2hunter2")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() =>
      expect(screen.getByLabelText("Username")).toHaveAttribute(
        "aria-invalid",
        "true"
      )
    )
    expect(screen.getByText("Unknown user.")).toBeInTheDocument()
  })
})

describe("the database sign-up screen", () => {
  it("registers then signs in, so the wizard is the next thing the user sees", async () => {
    const user = userEvent.setup()
    await renderInShell(<SignUpScreen />, {
      session: anonymousSession(),
      initialPath: "/signup",
    })

    await user.type(screen.getByLabelText("Username"), "einaras")
    await user.type(screen.getByLabelText("Password"), "hunter2hunter2")
    await user.type(screen.getByLabelText("Confirm password"), "hunter2hunter2")
    await user.click(screen.getByRole("button", { name: "Create account" }))

    await waitFor(() =>
      expect(postUser).toHaveBeenCalledWith({
        username: "einaras",
        password: "hunter2hunter2",
      })
    )
    expect(signInWithPassword).toHaveBeenCalledWith({
      username: "einaras",
      password: "hunter2hunter2",
    })
  })

  it("catches a password mismatch before it reaches the server", async () => {
    const user = userEvent.setup()
    await renderInShell(<SignUpScreen />, {
      session: anonymousSession(),
      initialPath: "/signup",
    })

    await user.type(screen.getByLabelText("Username"), "einaras")
    await user.type(screen.getByLabelText("Password"), "hunter2hunter2")
    await user.type(screen.getByLabelText("Confirm password"), "hunter2hunter3")
    await user.click(screen.getByRole("button", { name: "Create account" }))

    expect(
      screen.getByText("The two passwords are different.")
    ).toBeInTheDocument()
    expect(postUser).not.toHaveBeenCalled()
  })

  it("enforces the server's own 8-character minimum before submitting", async () => {
    const user = userEvent.setup()
    await renderInShell(<SignUpScreen />, {
      session: anonymousSession(),
      initialPath: "/signup",
    })

    await user.type(screen.getByLabelText("Username"), "einaras")
    await user.type(screen.getByLabelText("Password"), "short")
    await user.type(screen.getByLabelText("Confirm password"), "short")
    await user.click(screen.getByRole("button", { name: "Create account" }))

    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument()
    expect(postUser).not.toHaveBeenCalled()
  })
})
