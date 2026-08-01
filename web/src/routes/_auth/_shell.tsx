import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { authMeQueryOptions } from "@/auth"
import { AppShell } from "@/components/layout/app-shell"
import { needsOnboarding } from "@/components/layout/onboarding"
import { combinedLedgerInfiniteQueryOptions } from "@/features/transactions/api"
import {
  quickUploadsQueryOptions,
  REVIEW_LEDGER_PAGE_SIZE,
} from "@/features/transactions/review/api"
import { warm } from "@/lib/query"

import { warmScope } from "../-warm"

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export const Route = createFileRoute("/_auth/_shell")({
  beforeLoad: ({ context }) => {
    const me = context.queryClient.getQueryData(authMeQueryOptions().queryKey)
    if (needsOnboarding(me)) {
      throw redirect({ to: "/onboarding" })
    }
  },
  loader: async ({ context }) => {
    const scope = await warmScope(context)
    if (scope === null) return
    const { queryClient, userId } = scope
    warm([
      queryClient.ensureInfiniteQueryData(
        combinedLedgerInfiniteQueryOptions({
          userId,
          query: undefined,
          limit: REVIEW_LEDGER_PAGE_SIZE,
        })
      ),
      queryClient.ensureQueryData(quickUploadsQueryOptions(userId)),
    ])
  },
  component: ShellLayout,
})
