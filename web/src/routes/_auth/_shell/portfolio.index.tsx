import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { CHART_PERIODS, DEFAULT_CHART_PERIOD } from "@/components/chart"
import {
  RouteErrorPanel,
  RoutePending,
} from "@/components/layout/route-boundaries"
import { COMPOSITION_LENSES, PortfolioScreen } from "@/features/portfolio"
import {
  holdingsQueryOptions,
  portfolioHistoryQueryOptions,
  portfolioOverviewQueryOptions,
} from "@/features/portfolio/api"
import { warm } from "@/lib/query"

import { optionalEnum, optionalText } from "../../-search"
import { warmScope } from "../../-warm"

const portfolioSearchSchema = z.object({
  period: optionalEnum(CHART_PERIODS),
  lens: optionalEnum(COMPOSITION_LENSES),
  expand: optionalText,
  rows: optionalText,
  why: optionalText,
})

export const Route = createFileRoute("/_auth/_shell/portfolio/")({
  validateSearch: portfolioSearchSchema,
  loaderDeps: ({ search }) => ({
    period: search.period ?? DEFAULT_CHART_PERIOD,
  }),
  loader: async ({ context, deps }) => {
    const scope = await warmScope(context)
    if (scope === null) return
    const { queryClient, userId, defaultAssetId } = scope
    warm([
      queryClient.ensureQueryData(
        holdingsQueryOptions({ userId, defaultAssetId })
      ),
      queryClient.ensureQueryData(
        portfolioOverviewQueryOptions({ userId, defaultAssetId })
      ),
      queryClient.ensureQueryData(
        portfolioHistoryQueryOptions({
          userId,
          defaultAssetId,
          range: deps.period,
        })
      ),
    ])
  },
  component: PortfolioScreen,
  errorComponent: RouteErrorPanel,
  pendingComponent: RoutePending,
})
