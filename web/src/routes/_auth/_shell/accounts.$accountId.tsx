import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { CHART_PERIODS, DEFAULT_CHART_PERIOD } from "@/components/chart"
import {
  RouteErrorPanel,
  RoutePending,
} from "@/components/layout/route-boundaries"
import { AccountDetail } from "@/features/accounts"
import {
  accountConnectorsQueryOptions,
  accountPortfolioHistoryQueryOptions,
  accountPortfolioOverviewQueryOptions,
  accountQueryOptions,
} from "@/features/accounts/api"
import { holdingsQueryOptions } from "@/features/portfolio/api"
import { warm } from "@/lib/query"

import { optionalEnum } from "../../-search"
import { warmScope } from "../../-warm"

const accountSearchSchema = z.object({
  period: optionalEnum(CHART_PERIODS),
})

function AccountDetailRoute() {
  const { accountId } = Route.useParams()
  return <AccountDetail accountId={accountId} />
}

export const Route = createFileRoute("/_auth/_shell/accounts/$accountId")({
  validateSearch: accountSearchSchema,
  loaderDeps: ({ search }) => ({
    period: search.period ?? DEFAULT_CHART_PERIOD,
  }),
  loader: async ({ context, deps, params }) => {
    const scope = await warmScope(context)
    if (scope === null) return
    const { queryClient, userId, defaultAssetId } = scope
    const { accountId } = params
    warm([
      queryClient.ensureQueryData(accountQueryOptions({ userId, accountId })),
      queryClient.ensureQueryData(
        accountPortfolioOverviewQueryOptions({
          userId,
          accountId,
          defaultAssetId,
        })
      ),
      queryClient.ensureQueryData(
        accountPortfolioHistoryQueryOptions({
          userId,
          accountId,
          defaultAssetId,
          range: deps.period,
        })
      ),
      queryClient.ensureQueryData(
        holdingsQueryOptions({ userId, defaultAssetId })
      ),
      queryClient.ensureQueryData(accountConnectorsQueryOptions(userId)),
    ])
  },
  component: AccountDetailRoute,
  errorComponent: RouteErrorPanel,
  pendingComponent: RoutePending,
})
