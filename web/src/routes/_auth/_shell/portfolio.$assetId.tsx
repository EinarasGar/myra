import { createFileRoute, notFound } from "@tanstack/react-router"
import { z } from "zod"

import { CHART_PERIODS } from "@/components/chart"

import {
  RouteErrorPanel,
  RoutePending,
} from "@/components/layout/route-boundaries"
import {
  assetTypesQueryOptions,
  userAssetsQueryOptions,
} from "@/features/assets/api"
import { AssetScreen } from "@/features/portfolio"
import { assetOverviewQueryOptions } from "@/features/portfolio/api"
import { warm } from "@/lib/query"

import { optionalEnum, optionalText } from "../../-search"
import { warmScope } from "../../-warm"

const assetSearchSchema = z.object({
  period: optionalEnum(CHART_PERIODS),
  rows: optionalText,
})

function AssetRoute() {
  const { assetId } = Route.useParams()
  const parsed = Number(assetId)
  if (!Number.isInteger(parsed)) throw notFound()
  return <AssetScreen assetId={parsed} />
}

export const Route = createFileRoute("/_auth/_shell/portfolio/$assetId")({
  validateSearch: assetSearchSchema,
  loader: async ({ context, params }) => {
    const assetId = Number(params.assetId)
    if (!Number.isInteger(assetId)) return
    const scope = await warmScope(context)
    if (scope === null) return
    const { queryClient, userId, defaultAssetId } = scope
    warm([
      queryClient.ensureQueryData(
        assetOverviewQueryOptions({ userId, assetId, defaultAssetId })
      ),
      queryClient.ensureQueryData(userAssetsQueryOptions(userId)),
      queryClient.ensureQueryData(assetTypesQueryOptions()),
    ])
  },
  component: AssetRoute,
  errorComponent: RouteErrorPanel,
  pendingComponent: RoutePending,
})
