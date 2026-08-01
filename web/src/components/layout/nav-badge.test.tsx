import type { ReactNode } from "react"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  type AnyRouter,
  type RegisteredRouter,
} from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { mockTitle } from "@/lib/mock"
import { TooltipProvider } from "@/components/ui/tooltip"

import { BottomTabBar } from "./bottom-tab-bar"
import { IconRail } from "./icon-rail"
import { NavBadge } from "./nav-badge"
import { navBadgeLabel } from "./navigation"

vi.mock("./review-queue", () => ({
  useReviewQueue: () => ({
    count: 3,
    mockId: "transactions.review-proposals",
    isLowerBound: false,
  }),
}))

vi.mock("./profile-menu", () => ({
  ProfileMenu: () => null,
}))

afterEach(() => {
  vi.unstubAllEnvs()
})

async function renderNav(node: ReactNode) {
  const rootRoute = createRootRoute({
    component: () => <TooltipProvider>{node}</TooltipProvider>,
  })
  const leaf = (path: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    })
  const routeTree = rootRoute.addChildren([
    leaf("/"),
    leaf("/transactions"),
    leaf("/portfolio"),
    leaf("/accounts"),
    leaf("/ai-chat"),
    leaf("/settings"),
  ])
  const router: AnyRouter = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router as unknown as RegisteredRouter} />)
  await waitFor(() => {
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0)
  })
}

describe("navBadgeLabel", () => {
  it("leaves the label alone when nothing needs review", () => {
    expect(navBadgeLabel("Ledger", 0, false)).toBe("Ledger")
  })

  it("announces the exact count, singular and plural", () => {
    expect(navBadgeLabel("Ledger", 1, false)).toBe(
      "Ledger, 1 item needs review"
    )
    expect(navBadgeLabel("Ledger", 128, false)).toBe(
      "Ledger, 128 items need review"
    )
  })

  it("tells a screen reader when the count is invented", () => {
    expect(navBadgeLabel("Ledger", 3, true)).toBe(
      "Ledger, 3 items need review (example data)"
    )
  })

  it("says the count is a floor when the queue has unread pages", () => {
    expect(navBadgeLabel("Ledger", 50, false, true)).toBe(
      "Ledger, at least 50 items need review"
    )
  })
})

describe("NavBadge provenance", () => {
  it("renders a real count solid and unmarked", () => {
    render(<NavBadge count={4} mockId={null} />)
    const badge = screen.getByText("4")
    expect(badge).not.toHaveAttribute("data-mock")
    expect(badge).not.toHaveAttribute("title")
    expect(badge.className).toContain("bg-attention")
    expect(badge.className).not.toContain("border-dashed")
  })

  it("names the mock and looks provisional when the count is invented", () => {
    render(<NavBadge count={4} mockId="transactions.review-proposals" />)
    const badge = screen.getByText("4")
    expect(badge).toHaveAttribute("data-mock", "transactions.review-proposals")
    expect(badge).toHaveAttribute(
      "title",
      mockTitle("transactions.review-proposals")
    )
    expect(badge.className).toContain("border-dashed")
    expect(badge.className).not.toContain("text-on-brand")
  })

  it("keeps the data-mock attribute when the visible marker is suppressed", () => {
    vi.stubEnv("VITE_HIDE_MOCK_MARKERS", "true")
    render(<NavBadge count={4} mockId="transactions.review-proposals" />)
    const badge = screen.getByText("4")
    expect(badge).toHaveAttribute("data-mock", "transactions.review-proposals")
    expect(badge.className).not.toContain("border-dashed")
  })

  it("shows the count as a floor rather than a total when pages are unread", () => {
    render(<NavBadge count={50} mockId={null} isLowerBound />)
    expect(screen.getByText("50+")).toBeInTheDocument()
    expect(screen.queryByText("50")).toBeNull()
  })

  it("carries no colour literal", () => {
    render(<NavBadge count={4} mockId="transactions.review-proposals" />)
    expect(screen.getByText("4").className).not.toMatch(
      /oklch|#[0-9a-f]{3,8}|rgb\(/i
    )
  })
})

describe("review queue badge", () => {
  it("names the rail link with the count the badge shows", async () => {
    await renderNav(<IconRail pathname="/" />)

    expect(
      screen.getByRole("link", {
        name: "Ledger, 3 items need review (example data)",
      })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Portfolio" })).toBeInTheDocument()
  })

  it("names the tab link with the count the badge shows", async () => {
    await renderNav(<BottomTabBar pathname="/" />)

    expect(
      screen.getByRole("link", {
        name: "Review, 3 items need review (example data)",
      })
    ).toBeInTheDocument()
  })

  it("keeps the badge itself out of the accessibility tree", async () => {
    await renderNav(<BottomTabBar pathname="/" />)

    const badges = document.querySelectorAll('[data-slot="nav-badge"]')
    expect(badges.length).toBeGreaterThan(0)
    for (const badge of badges) {
      expect(badge).toHaveAttribute("aria-hidden")
      expect(badge).toHaveTextContent("3")
    }
    expect(screen.queryByText("3", { ignore: "[aria-hidden]" })).toBeNull()
  })

  it("marks every navigation surface that shows the mocked count", async () => {
    await renderNav(<BottomTabBar pathname="/" />)

    const marked = document.querySelectorAll(
      '[data-mock="transactions.review-proposals"]'
    )
    expect(marked.length).toBe(
      document.querySelectorAll('[data-slot="nav-badge"]').length
    )
    for (const node of marked) {
      expect(node).toHaveAttribute("title")
    }
  })
})
