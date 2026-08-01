import { createFileRoute } from "@tanstack/react-router"

import { DEFAULT_CHART_PERIOD } from "@/components/chart"
import {
  RouteErrorPanel,
  RoutePending,
} from "@/components/layout/route-boundaries"
import { AccountsIndex } from "@/features/accounts"
import {
  accountConnectorsQueryOptions,
  accountLiquidityTypesQueryOptions,
  accountsQueryOptions,
  accountTypesQueryOptions,
} from "@/features/accounts/api"
import {
  holdingsQueryOptions,
  portfolioHistoryQueryOptions,
  portfolioOverviewQueryOptions,
} from "@/features/portfolio/api"
import { warm } from "@/lib/query"

import { warmScope } from "../../-warm"

export const Route = createFileRoute("/_auth/_shell/accounts/")({
  loader: async ({ context }) => {
    const scope = await warmScope(context)
    if (scope === null) return
    const { queryClient, userId, defaultAssetId } = scope
    warm([
      queryClient.ensureQueryData(accountsQueryOptions(userId)),
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
          range: DEFAULT_CHART_PERIOD,
        })
      ),
      queryClient.ensureQueryData(accountConnectorsQueryOptions(userId)),
      queryClient.ensureQueryData(accountTypesQueryOptions()),
      queryClient.ensureQueryData(accountLiquidityTypesQueryOptions()),
    ])
  },
  component: AccountsIndex,
  errorComponent: RouteErrorPanel,
  pendingComponent: RoutePending,
})
