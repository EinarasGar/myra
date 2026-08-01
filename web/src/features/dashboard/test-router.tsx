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
import { render, screen } from "@testing-library/react"

const PATHS = [
  "/",
  "/transactions",
  "/portfolio",
  "/accounts",
  "/ai-chat",
  "/settings",
] as const

export async function renderInRouter(node: ReactNode) {
  const rootRoute = createRootRoute({
    component: () => <div data-testid="harness">{node}</div>,
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
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  const result = render(
    <RouterProvider router={router as unknown as RegisteredRouter} />
  )
  await screen.findByTestId("harness")
  return { ...result, router }
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
