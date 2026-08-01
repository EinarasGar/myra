import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  type AnyRouter,
  type RegisteredRouter,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"

import { FigureBaseCurrencyProvider } from "@/components/figure"

import { AuthSessionContext, type AuthSession } from "@/auth"
import type { ShellWidth } from "@/components/layout/breakpoints"

export const TEST_USER_ID = "00000000-0000-0000-0000-000000000000"

export const VIEWPORTS: Record<ShellWidth, number> = {
  full: 1440,
  tight: 1100,
  stacked: 900,
  phone: 390,
}

export const PATHS = [
  "/",
  "/login",
  "/signup",
  "/onboarding",
  "/transactions",
  "/settings",
] as const

export function authenticatedSession(baseCurrency: string | null): AuthSession {
  return {
    status: "authenticated",
    isReady: true,
    isAuthenticated: true,
    userId: TEST_USER_ID,
    baseCurrency,
    signOut: () => Promise.resolve(),
  }
}

export function anonymousSession(): AuthSession {
  return {
    status: "anonymous",
    isReady: true,
    isAuthenticated: false,
    userId: null,
    baseCurrency: null,
    signOut: () => Promise.resolve(),
  }
}

export function stubViewport(viewportWidth: number) {
  window.matchMedia = ((query: string) => {
    const minWidth = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return {
      matches: viewportWidth >= minWidth,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
}

export interface RenderOptions {
  session?: AuthSession
  queryClient?: QueryClient
  initialPath?: (typeof PATHS)[number]
}

export async function renderInShell(
  node: ReactNode,
  options: RenderOptions = {}
) {
  const session = options.session ?? authenticatedSession(null)
  const queryClient = options.queryClient ?? createTestQueryClient()
  const visited: string[] = []

  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <AuthSessionContext.Provider value={session}>
          <FigureBaseCurrencyProvider currency={"GBP"}>
            <div data-testid="harness">{node}</div>
          </FigureBaseCurrencyProvider>
        </AuthSessionContext.Provider>
      </QueryClientProvider>
    ),
  })
  const routeTree = rootRoute.addChildren(
    PATHS.map((path) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path,
        component: () => null,
      })
    )
  )
  const router: AnyRouter = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [options.initialPath ?? "/onboarding"],
    }),
  })
  router.subscribe("onResolved", () => {
    visited.push(
      router.state.location.pathname + router.state.location.searchStr
    )
  })

  const result = render(
    <RouterProvider router={router as unknown as RegisteredRouter} />
  )
  await screen.findByTestId("harness")
  return { ...result, router, visited, queryClient }
}
