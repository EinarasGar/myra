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
import { Toaster } from "@/components/ui/toast"

export const TEST_USER_ID = "00000000-0000-0000-0000-000000000000"

const SESSION: AuthSession = {
  status: "authenticated",
  isReady: true,
  isAuthenticated: true,
  userId: TEST_USER_ID,
  baseCurrency: "GBP",
  signOut: () => Promise.resolve(),
}

const PATHS = [
  "/",
  "/accounts",
  "/accounts/$accountId",
  "/transactions",
  "/settings",
] as const

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

export async function renderAccounts(
  node: ReactNode,
  queryClient: QueryClient = createTestQueryClient()
) {
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <AuthSessionContext.Provider value={SESSION}>
          <Toaster>
            <FigureBaseCurrencyProvider currency={"GBP"}>
              <div data-testid="harness">{node}</div>
            </FigureBaseCurrencyProvider>
          </Toaster>
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
    history: createMemoryHistory({ initialEntries: ["/accounts"] }),
  })
  const result = render(
    <RouterProvider router={router as unknown as RegisteredRouter} />
  )
  await screen.findByTestId("harness")
  return result
}
