import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import {
  RootErrorPanel,
  RootPending,
} from "@/components/layout/route-boundaries"

function AuthLayout() {
  return <Outlet />
}

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login", search: { redirect: location.href } })
    }
  },
  component: AuthLayout,
  errorComponent: RootErrorPanel,
  pendingComponent: RootPending,
})
