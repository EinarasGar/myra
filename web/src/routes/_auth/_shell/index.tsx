import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { CHART_PERIODS, DEFAULT_CHART_PERIOD } from "@/components/chart"
import {
  RouteErrorPanel,
  RoutePending,
} from "@/components/layout/route-boundaries"
import {
  accountConnectorsQueryOptions,
  accountsQueryOptions,
} from "@/features/accounts/api"
import { DashboardScreen } from "@/features/dashboard"
import {
  holdingsQueryOptions,
  portfolioHistoryQueryOptions,
  portfolioOverviewQueryOptions,
} from "@/features/portfolio/api"
import { warm } from "@/lib/query"

import { optionalEnum } from "../../-search"
import { warmScope } from "../../-warm"

const dashboardSearchSchema = z.object({
  period: optionalEnum(CHART_PERIODS),
})

export const Route = createFileRoute("/_auth/_shell/")({
  validateSearch: dashboardSearchSchema,
  loaderDeps: ({ search }) => ({
    period: search.period ?? DEFAULT_CHART_PERIOD,
  }),
  loader: async ({ context, deps }) => {
    const scope = await warmScope(context)
    if (scope === null) return
    const { queryClient, userId, defaultAssetId } = scope
    warm([
      queryClient.ensureQueryData(
        portfolioHistoryQueryOptions({
          userId,
          defaultAssetId,
          range: deps.period,
        })
      ),
      queryClient.ensureQueryData(
        holdingsQueryOptions({ userId, defaultAssetId })
      ),
      queryClient.ensureQueryData(
        portfolioOverviewQueryOptions({ userId, defaultAssetId })
      ),
      queryClient.ensureQueryData(accountsQueryOptions(userId)),
      queryClient.ensureQueryData(accountConnectorsQueryOptions(userId)),
    ])
  },
  component: DashboardScreen,
  errorComponent: RouteErrorPanel,
  pendingComponent: RoutePending,
})
