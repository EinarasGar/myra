import { useCallback, useState, type ReactNode } from "react"
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

import type { ExplorePatchSearch, ExploreSearch } from "./tokens"

export const TEST_USER_ID = "00000000-0000-0000-0000-000000000000"

export const VIEWPORTS: Record<ShellWidth, number> = {
  full: 1440,
  tight: 1100,
  stacked: 900,
  phone: 390,
}

const SESSION: AuthSession = {
  status: "authenticated",
  isReady: true,
  isAuthenticated: true,
  userId: TEST_USER_ID,
  baseCurrency: "GBP",
  signOut: () => Promise.resolve(),
}

const PATHS = ["/", "/transactions", "/accounts", "/settings"] as const

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
    },
  })
}

/**
 * Stands in for the URL the route reads back: the screen only sees state it wrote through
 * `onPatch`, so a test that never applies a patch is testing a screen that cannot change.
 */
export function useSearchStub(
  initial: ExploreSearch = {},
  spy?: ExplorePatchSearch
): { search: ExploreSearch; onPatch: ExplorePatchSearch } {
  const [search, setSearch] = useState<ExploreSearch>(initial)
  const onPatch = useCallback<ExplorePatchSearch>(
    (patch, history) => {
      if (history === undefined) spy?.(patch)
      else spy?.(patch, history)
      setSearch((previous) => ({ ...previous, ...patch }))
    },
    [spy]
  )
  return { search, onPatch }
}

export async function renderExplore(
  node: ReactNode,
  queryClient: QueryClient = createTestQueryClient()
) {
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <AuthSessionContext.Provider value={SESSION}>
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
    history: createMemoryHistory({ initialEntries: ["/transactions"] }),
  })
  const result = render(
    <RouterProvider router={router as unknown as RegisteredRouter} />
  )
  await screen.findByTestId("harness")
  return result
}
