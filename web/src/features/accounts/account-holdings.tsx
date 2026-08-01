import { useMemo } from "react"

import { Figure } from "@/components/figure"
import { createSeriesColors, SeriesSwatch, ShareBar } from "@/components/chart"
import { useShellWidth } from "@/components/layout/breakpoints"
import {
  DataCell,
  DataRow,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
  DataTableHeaderRow,
  FigureCell,
  Panel,
  PanelFootnote,
  PanelHeader,
  PanelNote,
  PanelTitle,
  Truncate,
} from "@/components/primitives"
import type {
  AssetHolding,
  PortfolioOverviewView,
} from "@/features/portfolio/api"
import { assetLabel } from "@/lib/domain/refs"

import {
  holdingsColumns,
  HOLDINGS_COLUMNS,
  HOLDINGS_GAP,
  HOLDINGS_PADDING,
} from "./presentation"

function holdingName(holding: AssetHolding): string {
  return holding.asset === null
    ? `Asset ${String(holding.assetId)}`
    : assetLabel(holding.asset)
}

function holdingSubLabel(holding: AssetHolding): string | null {
  const asset = holding.asset
  if (asset === null || asset.ticker === null) return null
  return asset.name
}

export function AccountHoldings({
  overview,
}: {
  overview: PortfolioOverviewView
}) {
  const width = useShellWidth()
  const colors = useMemo(
    () =>
      createSeriesColors(overview.assets.map((asset) => String(asset.assetId))),
    [overview.assets]
  )

  if (overview.assets.length === 0) return null

  const total = overview.totals.marketValue
  const { showUnits, showShare, showGains } = holdingsColumns(width)

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Holdings</PanelTitle>
        <PanelNote>held in this account</PanelNote>
      </PanelHeader>
      <DataTable
        columns={HOLDINGS_COLUMNS}
        gap={HOLDINGS_GAP}
        padding={HOLDINGS_PADDING}
        aria-label="Holdings in this account"
      >
        <DataTableHead>
          <DataTableHeaderRow>
            <DataTableHeaderCell>Asset</DataTableHeaderCell>
            {showUnits ? (
              <DataTableHeaderCell numeric>Units</DataTableHeaderCell>
            ) : null}
            <DataTableHeaderCell numeric>Value</DataTableHeaderCell>
            {showShare ? (
              <DataTableHeaderCell>Share</DataTableHeaderCell>
            ) : null}
            {showGains ? (
              <DataTableHeaderCell numeric>
                Since you bought
              </DataTableHeaderCell>
            ) : null}
          </DataTableHeaderRow>
        </DataTableHead>
        <DataTableBody>
          {overview.assets.map((holding) => {
            const share = total === 0 ? 0 : holding.marketValue / total
            const name = holdingName(holding)
            const sub = holdingSubLabel(holding)
            return (
              <DataRow
                key={holding.assetId}
                size="two-line"
                className="h-[54px]"
              >
                <DataCell>
                  <div className="flex min-w-0 items-center gap-[9px]">
                    <SeriesSwatch
                      color={colors.colorFor(String(holding.assetId))}
                    />
                    <Truncate
                      text={name}
                      className="min-w-0 text-[13px] leading-[1.3] font-medium"
                    />
                  </div>
                  {sub === null ? null : (
                    <Truncate
                      text={sub}
                      className="block ps-[15px] font-mono text-[11px] leading-[1.4] text-ink-3"
                    />
                  )}
                </DataCell>
                {showUnits ? (
                  <FigureCell>
                    <Figure
                      value={holding.unitsRemaining}
                      kind="units"
                      size="base"
                    />
                  </FigureCell>
                ) : null}
                <FigureCell>
                  <Figure value={holding.marketValue} size="base" />
                </FigureCell>
                {showShare ? (
                  <DataCell className="overflow-visible">
                    <ShareBar
                      variant="pivot"
                      value={share}
                      color={colors.colorFor(String(holding.assetId))}
                      label={`${name} is ${String(Math.round(share * 100))}% of this account's assets`}
                    />
                  </DataCell>
                ) : null}
                {showGains ? (
                  <FigureCell>
                    <Figure
                      value={holding.totalGains}
                      intent="gainLoss"
                      size="base"
                    />
                    <div className="mt-[5px]">
                      <Figure
                        value={holding.returnRatio}
                        kind="percent"
                        scale="ratio"
                        intent="gainLoss"
                        size="micro"
                      />
                    </div>
                  </FigureCell>
                ) : null}
              </DataRow>
            )
          })}
          <DataRow
            variant="totals"
            size="two-line"
            className="h-[54px] border-b-0"
          >
            <DataCell className="text-[12px] leading-none font-semibold">
              Total
            </DataCell>
            {showUnits ? <DataCell /> : null}
            <FigureCell>
              <Figure
                value={total}
                size="base"
                className="text-[14px] font-bold"
              />
            </FigureCell>
            {showShare ? <DataCell /> : null}
            {showGains ? (
              <FigureCell>
                <Figure
                  value={overview.totals.totalGains}
                  intent="gainLoss"
                  size="base"
                  className="font-semibold"
                />
              </FigureCell>
            ) : null}
          </DataRow>
        </DataTableBody>
      </DataTable>
      <PanelFootnote>
        Value and gains are lifetime figures for the priced positions in this
        account. Cash sits in the account but has no cost basis, so it carries
        no profit or loss and is not in this table. Lots are matched
        first-in-first-out within this account.
      </PanelFootnote>
    </Panel>
  )
}
