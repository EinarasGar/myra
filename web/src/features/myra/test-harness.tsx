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

export const TEST_USER_ID = "00000000-0000-0000-0000-000000000000"

const SESSION: AuthSession = {
  status: "authenticated",
  isReady: true,
  isAuthenticated: true,
  userId: TEST_USER_ID,
  baseCurrency: "GBP",
  signOut: () => Promise.resolve(),
}

const PATHS = ["/", "/transactions", "/ai-chat"] as const

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

function ensureResizeObserver(): void {
  if ("ResizeObserver" in globalThis) return
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
}

export function sseResponse(frames: readonly string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      for (const frame of frames) controller.enqueue(encoder.encode(frame))
      controller.close()
    },
  })
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  })
}

export function sseFrame(event: string, data: unknown): string {
  const payload = typeof data === "string" ? data : JSON.stringify(data)
  return `event: ${event}\ndata: ${payload}\n\n`
}

export async function renderMyra(
  node: ReactNode,
  queryClient: QueryClient = createTestQueryClient()
) {
  ensureResizeObserver()
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
    history: createMemoryHistory({ initialEntries: ["/ai-chat"] }),
  })
  const result = render(
    <RouterProvider router={router as unknown as RegisteredRouter} />
  )
  await screen.findByTestId("harness")
  return result
}
