import { startTransition, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { useBaseCurrency, useUserId } from "@/auth"
import type { ChartPeriod } from "@/components/chart"
import {
  readFlag,
  usePeriodSearch,
  useSearchState,
  writeFlag,
} from "@/components/layout/search-state"
import { PageHeader, PageHeaderBackLink } from "@/components/primitives"
import { EmptyState } from "@/components/states/empty-state"
import { CustomAssetPanel, CUSTOM_ASSET_UNHELD_BODY } from "@/features/assets"
import {
  assetTypesQueryOptions,
  useCustomAssetRef,
} from "@/features/assets/api"
import {
  assetHoldingOf,
  useAssetOverviewSuspense,
  useRequiredBaseAssetId,
} from "@/features/portfolio/api"
import { assetLabel } from "@/lib/domain/refs"

import { AssetHero } from "./asset-hero"
import { AssetTiles } from "./asset-tiles"
import { ASSET_EMPTY_BODY, ASSET_EMPTY_HEADLINE, FIFO_SCOPE_NOTE } from "./copy"
import { buildLotRows, buildLotTotals } from "./lots"
import { LotsTable } from "./lots-table"
import { LOT_ROWS_DRAWN } from "./presentation"

function BackToPortfolio() {
  return (
    <PageHeaderBackLink render={<Link to="/portfolio" />}>
      Portfolio
    </PageHeaderBackLink>
  )
}

export function AssetScreen({ assetId }: { assetId: number }) {
  const userId = useUserId()
  const defaultAssetId = useRequiredBaseAssetId()
  const baseCurrency = useBaseCurrency()
  const overview = useAssetOverviewSuspense({
    userId,
    assetId,
    defaultAssetId,
  })
  const { data: assetTypes } = useQuery(assetTypesQueryOptions())

  const [period, setPeriod] = usePeriodSearch()
  const [allLots, setAllLots] = useSearchState("rows", readFlag, writeFlag)

  const holding = assetHoldingOf(overview)
  const customAsset = useCustomAssetRef(userId, assetId)
  const asset = overview.lookups.assetsById[assetId] ?? customAsset
  const typeName =
    assetTypes?.find((type) => type.id === asset?.assetTypeId)?.name ?? null

  const lotRows = useMemo(
    () => (holding === null ? [] : buildLotRows(holding, overview)),
    [holding, overview]
  )
  const lotTotals = useMemo(
    () => (holding === null ? null : buildLotTotals(holding)),
    [holding]
  )

  const title = asset === null ? `Asset ${String(assetId)}` : assetLabel(asset)
  const meta =
    asset?.name !== null && asset?.name !== undefined && asset.name !== title
      ? asset.name
      : null

  const changePeriod = (next: ChartPeriod) => {
    startTransition(() => {
      setPeriod(next)
    })
  }

  return (
    <>
      <PageHeader
        back={<BackToPortfolio />}
        eyebrow={typeName ?? "Holding"}
        title={title}
        {...(meta === null ? {} : { meta })}
      />

      {holding === null || lotTotals === null ? (
        customAsset === null ? (
          <EmptyState
            size="page"
            headline={ASSET_EMPTY_HEADLINE}
            body={ASSET_EMPTY_BODY}
            footnote={`Lots are matched ${FIFO_SCOPE_NOTE}, so an asset you have never bought has no lot ledger at all.`}
          />
        ) : (
          <div className="flex flex-col gap-[26px]">
            <CustomAssetPanel assetId={assetId} withChart />
            <EmptyState
              headline={ASSET_EMPTY_HEADLINE}
              body={CUSTOM_ASSET_UNHELD_BODY}
              footnote={`Lots are matched ${FIFO_SCOPE_NOTE}, so an asset you have never bought has no lot ledger at all.`}
            />
          </div>
        )
      ) : (
        <div className="flex flex-col gap-[26px]">
          <AssetHero
            assetId={assetId}
            holding={holding}
            period={period}
            onPeriodChange={changePeriod}
          />

          <AssetTiles
            holding={holding}
            totals={lotTotals}
            currency={baseCurrency}
            ticker={asset?.ticker ?? null}
          />

          <LotsTable
            rows={lotRows}
            totals={lotTotals}
            currency={baseCurrency}
            ticker={asset?.ticker ?? null}
            shown={allLots ? lotRows.length : LOT_ROWS_DRAWN}
            onShowAll={() => {
              setAllLots(true)
            }}
          />

          {customAsset === null ? null : (
            <CustomAssetPanel assetId={assetId} withChart={false} />
          )}
        </div>
      )}
    </>
  )
}
