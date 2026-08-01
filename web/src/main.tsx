import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"

import "./index.css"
import { AuthProvider, type AuthSession } from "@/auth"
import { queryClient } from "@/lib/query"
import { AppRouterProvider } from "@/components/layout/app-router-provider"
import { ShellWidthProvider } from "@/components/layout/breakpoints"
import {
  RootErrorPanel,
  RouteNotFound,
  RoutePending,
} from "@/components/layout/route-boundaries"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { routeTree } from "./routeTree.gen"

const router = createRouter({
  routeTree,
  context: { queryClient, auth: undefined as unknown as AuthSession },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  defaultPendingComponent: RoutePending,
  defaultErrorComponent: RootErrorPanel,
  defaultNotFoundComponent: RouteNotFound,
  defaultPendingMs: 150,
  defaultPendingMinMs: 200,
  scrollRestoration: true,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ShellWidthProvider>
      <ThemeProvider defaultTheme="system">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster>
              <AuthProvider>
                <AppRouterProvider router={router} queryClient={queryClient} />
              </AuthProvider>
            </Toaster>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ShellWidthProvider>
  </StrictMode>
)
