import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
  type AnyRouter,
  type RegisteredRouter,
} from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { normalizeHttpError, normalizeTransportError } from "@/lib/errors"

import { ErrorStateFor, RateLimitBanner } from "./error-states"

function renderInRouter(node: React.ReactNode) {
  const rootRoute = createRootRoute({ component: () => node })
  const router: AnyRouter = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router as unknown as RegisteredRouter} />)
}

const offlineError = normalizeTransportError(new TypeError("Failed to fetch"))

describe("ErrorStateFor", () => {
  it("renders an offline state for a transport failure", async () => {
    renderInRouter(<ErrorStateFor error={offlineError} />)
    await waitFor(() => {
      expect(screen.getByText("Can't reach Sverto")).toBeInTheDocument()
    })
    expect(screen.getByRole("status")).toHaveAttribute("data-state", "offline")
  })

  it("renders a degraded state for a transient server error", async () => {
    const error = normalizeHttpError({ status: 503 })
    renderInRouter(<ErrorStateFor error={error} />)
    await waitFor(() => {
      expect(screen.getByText("Sverto is having trouble")).toBeInTheDocument()
    })
    expect(screen.getByRole("status")).toHaveAttribute("data-state", "degraded")
  })

  it("renders an alert for a hard server error", async () => {
    const error = normalizeHttpError({ status: 500 })
    renderInRouter(<ErrorStateFor error={error} />)
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveAttribute("data-state", "error")
    })
  })

  it("renders a waiting state, not an alert, when rate limited", async () => {
    const error = normalizeHttpError({
      status: 429,
      data: "Too Many Requests",
      headers: { "retry-after": "45" },
    })
    renderInRouter(<ErrorStateFor error={error} />)
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveAttribute(
        "data-state",
        "waiting"
      )
    })
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByText(/Try again in 45s\./)).toBeInTheDocument()
  })

  it("never prints a raw ISO timestamp when Myra is rate limited", async () => {
    const error = normalizeHttpError({
      status: 429,
      data: {
        error_type: "RateLimited",
        message: "Rate limit exceeded.",
        errors: [],
        details: {
          kind: "rate_limited",
          message: "AI usage limit reached.",
          reset_at: "2026-07-30T22:00:00Z",
          scope: "user",
        },
      },
    })
    renderInRouter(<ErrorStateFor error={error} />)
    await waitFor(() => {
      expect(screen.getByText("Myra needs a moment")).toBeInTheDocument()
    })
    const banner = screen.getByRole("status")
    expect(banner.textContent).toMatch(/Resets at /)
    expect(banner.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}T/)
  })

  it("offers a sign-in action when the session ended", async () => {
    const error = normalizeHttpError({ status: 401 })
    renderInRouter(<ErrorStateFor error={error} />)
    await waitFor(() => {
      expect(screen.getByText("Your session ended")).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
  })
})

describe("RateLimitBanner", () => {
  it("renders a banner, never a dialog, for a rate limit", () => {
    const error = normalizeHttpError({
      status: 429,
      data: "Too Many Requests",
      headers: { "retry-after": "120" },
    })
    render(<RateLimitBanner error={error} />)
    const banner = screen.getByRole("status")
    expect(banner).toHaveAttribute("data-state", "rate-limited")
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByText(/Try again in 2 min\./)).toBeInTheDocument()
  })

  it("renders nothing for any other error", () => {
    const { container } = render(
      <RateLimitBanner error={normalizeHttpError({ status: 500 })} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
