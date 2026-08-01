import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type AnyRouter,
  type RegisteredRouter,
} from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { authMeQueryKey, AuthSessionContext, type AuthSession } from "@/auth"
import { AuthProvider } from "@/auth/provider"
import { AUTH_PROVIDER_MODES, env } from "@/lib/env"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider"

import { AppShell } from "./app-shell"

const SESSION: AuthSession = {
  status: "authenticated",
  isReady: true,
  isAuthenticated: true,
  userId: "00000000-0000-0000-0000-000000000000",
  baseCurrency: "GBP",
  signOut: () => Promise.resolve(),
}

function stubViewport(width: number) {
  window.matchMedia = ((query: string) => {
    const minWidth = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return {
      matches: width >= minWidth,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
}

function buildRouter(initialPath: string): AnyRouter {
  const rootRoute = createRootRoute()
  const shellRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "shell",
    component: () => (
      <AppShell>
        <p>page body</p>
      </AppShell>
    ),
  })
  const leaf = (path: string) =>
    createRoute({
      getParentRoute: () => shellRoute,
      path,
      component: () => <Outlet />,
    })

  const routeTree = rootRoute.addChildren([
    shellRoute.addChildren([
      leaf("/"),
      leaf("/transactions"),
      leaf("/portfolio"),
      leaf("/accounts"),
      leaf("/ai-chat"),
      leaf("/settings"),
    ]),
  ])

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
}

function renderShell(path = "/"): ReactNode {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(authMeQueryKey, {
    user_id: SESSION.userId,
    role: "user",
    onboarding_version: 1,
    default_asset: { id: 1, ticker: "GBP" },
    user_metadata: { username: "Einaras Garbašauskas", image_url: null },
  })

  const router = buildRouter(path)

  render(
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthSessionContext value={SESSION}>
            <RouterProvider router={router as unknown as RegisteredRouter} />
          </AuthSessionContext>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )

  return null
}

describe("vitest environment", () => {
  it("reads the repo-root .env so @/lib/env loads unmocked", () => {
    expect(AUTH_PROVIDER_MODES).toContain(env.authProvider)
  })

  it("resolves @/auth/provider to the configured implementation", () => {
    expect(typeof AuthProvider).toBe("function")
  })
})

describe("AppShell chrome", () => {
  beforeEach(() => {
    stubViewport(1440)
  })

  it("renders the icon rail and the desktop search trigger at 1440", async () => {
    stubViewport(1440)
    renderShell()

    await waitFor(() => {
      expect(screen.getByText("page body")).toBeInTheDocument()
    })

    const nav = screen.getByRole("navigation", { name: "Primary" })
    expect(nav.className).toContain("w-[58px]")
    expect(screen.getByText("Search or ask Myra…")).toBeInTheDocument()
    expect(screen.getByText("⌘K")).toBeInTheDocument()
  })

  it("marks the active destination on the rail", async () => {
    stubViewport(1440)
    renderShell("/portfolio")

    await waitFor(() => {
      expect(screen.getByText("page body")).toBeInTheDocument()
    })

    const active = screen.getByLabelText("Portfolio")
    expect(active).toHaveAttribute("aria-current", "page")
    expect(screen.getByLabelText("Home")).not.toHaveAttribute("aria-current")
  })

  it("replaces the rail with a bottom tab bar below 768", async () => {
    stubViewport(390)
    renderShell("/transactions")

    await waitFor(() => {
      expect(screen.getByText("page body")).toBeInTheDocument()
    })

    const nav = screen.getByRole("navigation", { name: "Primary" })
    expect(nav.className).toContain("bottom-0")
    expect(screen.getByText("Review")).toBeInTheDocument()
    expect(screen.getByText("Transactions")).toBeInTheDocument()
    expect(screen.queryByText("Search or ask Myra…")).not.toBeInTheDocument()
  })

  it("uses the compact top bar between 768 and 1023 without a bottom tab bar", async () => {
    stubViewport(900)
    renderShell("/accounts")

    await waitFor(() => {
      expect(screen.getByText("page body")).toBeInTheDocument()
    })

    expect(
      screen.getByRole("button", { name: "Open navigation" })
    ).toBeInTheDocument()
    const nav = screen.queryByRole("navigation", { name: "Primary" })
    expect(nav).toBeNull()
    expect(screen.getByText("Accounts")).toBeInTheDocument()
  })
})
