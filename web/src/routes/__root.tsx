import { lazy, Suspense } from "react"
import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"

import type { AuthSession } from "@/auth"
import { ApiErrorToaster } from "@/components/layout/api-error-toaster"
import { DocumentTitle } from "@/components/layout/document-title"
import {
  RootErrorPanel,
  RouteNotFound,
} from "@/components/layout/route-boundaries"
import { CommandPalette } from "@/components/command-palette/command-palette"

export interface AppRouterContext {
  queryClient: QueryClient
  auth: AuthSession
}

const Devtools = import.meta.env.DEV
  ? lazy(async () => ({
      default: (await import("@/components/layout/devtools")).Devtools,
    }))
  : () => null

function RootLayout() {
  return (
    <>
      <DocumentTitle />
      <ApiErrorToaster />
      <Outlet />
      <CommandPalette />
      <Suspense fallback={null}>
        <Devtools />
      </Suspense>
    </>
  )
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootLayout,
  errorComponent: RootErrorPanel,
  notFoundComponent: RouteNotFound,
})
