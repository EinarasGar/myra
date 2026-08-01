import { startTransition, useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"

import { useBaseCurrency, useUserId } from "@/auth"
import type { ChartPeriod } from "@/components/chart"
import { createSeriesColors } from "@/components/chart"
import { Figure } from "@/components/figure"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import {
  readFlag,
  readKeySet,
  usePeriodSearch,
  useSearchState,
  writeFlag,
  writeKeySet,
} from "@/components/layout/search-state"
import {
  focusRing,
  Footnote,
  HIT_TARGET_ROW,
  PageHeader,
} from "@/components/primitives"
import { EmptyState } from "@/components/states/empty-state"
import { DegradedState } from "@/components/states/message-state"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  useHoldings,
  useHoldingsSuspense,
  usePortfolioHistorySuspense,
  usePortfolioOverviewSuspense,
  useRequiredBaseAssetId,
} from "@/features/portfolio/api"
import { formatDateTimeStamp } from "@/lib/format"
import { mockAttributes, MockBadge } from "@/lib/mock"
import { cn } from "@/lib/utils"

import { attributionMarket, usePortfolioAttribution } from "./attribution"
import { readLens, writeLens } from "./composition"
import { CompositionPanel } from "./composition-panel"
import {
  CASH_IN_TOTAL_NOTE,
  EMPTY_BODY,
  EMPTY_FOOTNOTE,
  EMPTY_HEADLINE,
  LIFETIME_ONLY_NOTE,
  NO_WINDOW_CHANGE_NOTE,
  PRICES_AS_OF_NOTE,
  pricesAsOfLabel,
  ratelessNote,
  STALE_PRICES_BODY,
  STALE_PRICES_HEADLINE,
} from "./copy"
import { buildHoldingRows, summariseHoldings } from "./holdings"
import { HoldingsTable } from "./holdings-table"
import { usePeriodColumn } from "./period"
import { PortfolioHero } from "./portfolio-hero"
import { HOLDINGS_ROWS_DRAWN } from "./presentation"
import { pricesAsOf } from "./prices"
import { PortfolioBodySkeleton } from "./skeletons"
import { WhyItMoved } from "./why-it-moved"

function PortfolioBody({ period }: { period: ChartPeriod }) {
  const userId = useUserId()
  const defaultAssetId = useRequiredBaseAssetId()
  const baseCurrency = useBaseCurrency()

  const holdings = useHoldingsSuspense({ userId, defaultAssetId })
  const overview = usePortfolioOverviewSuspense({ userId, defaultAssetId })
  const series = usePortfolioHistorySuspense({
    userId,
    defaultAssetId,
    range: period,
  })

  const rows = useMemo(
    () => buildHoldingRows(holdings, overview),
    [holdings, overview]
  )
  const summary = useMemo(
    () => summariseHoldings(rows, holdings, overview),
    [rows, holdings, overview]
  )
  const attribution = usePortfolioAttribution(series)
  const periodColumn = usePeriodColumn(
    rows,
    period,
    attributionMarket(attribution)
  )

  const assetColors = useMemo(
    () => createSeriesColors(rows.map((row) => row.key)),
    [rows]
  )
  const accountColors = useMemo(
    () =>
      createSeriesColors(holdings.byAccount.map((entry) => entry.accountId)),
    [holdings.byAccount]
  )

  const [lens, setLens] = useSearchState("lens", readLens, writeLens)
  const [expanded, setExpanded] = useSearchState(
    "expand",
    readKeySet,
    writeKeySet
  )
  const [allRows, setAllRows] = useSearchState("rows", readFlag, writeFlag)
  const [whyOpen, setWhyOpen] = useSearchState("why", readFlag, writeFlag)

  const navigate = useNavigate()
  const prices = useMemo(() => pricesAsOf(), [])

  if (rows.length === 0) {
    return (
      <EmptyState
        size="page"
        headline={EMPTY_HEADLINE}
        body={EMPTY_BODY}
        actions={[
          {
            label: "Add an account",
            kind: "primary",
            onClick: () => {
              void navigate({ to: "/accounts" })
            },
          },
        ]}
        footnote={EMPTY_FOOTNOTE}
      />
    )
  }

  const toggle = (key: string) => {
    const next = new Set(expanded)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpanded(next)
  }

  return (
    <div className="flex flex-col gap-[26px]">
      {attribution === null ? (
        <p
          data-slot="portfolio-no-split"
          className="text-[13px] leading-[1.5] text-ink-3"
        >
          {NO_WINDOW_CHANGE_NOTE}
        </p>
      ) : (
        <Collapsible open={whyOpen} onOpenChange={setWhyOpen}>
          <div
            data-slot="portfolio-split"
            className="flex flex-wrap items-center gap-x-[9px] gap-y-2"
          >
            <p className="text-[13px] leading-[1.5] text-ink-2">
              <span data-slot="portfolio-split-scope">
                Over the full {attribution.attribution.rangeLabel} window,{" "}
                <Figure
                  value={attribution.attribution.total}
                  currency={baseCurrency}
                  intent="gainLoss"
                  sign="always"
                  className="text-[13px]"
                />
              </span>{" "}
              &mdash;{" "}
              <span {...mockAttributes(attribution.mockId)}>
                <Figure
                  value={attribution.attribution.subtotals[0].amount}
                  currency={baseCurrency}
                  intent="gainLoss"
                  sign="always"
                  className="text-[13px]"
                />{" "}
                paid in,{" "}
                <Figure
                  value={attribution.attribution.subtotals[1].amount}
                  currency={baseCurrency}
                  intent="gainLoss"
                  sign="always"
                  className="text-[13px]"
                />{" "}
                earned by your holdings.
                <span className="sr-only">
                  {" "}
                  That split is invented; the window change it splits is not.
                </span>
              </span>
            </p>
            <MockBadge id={attribution.mockId} />
            <CollapsibleTrigger
              className={cn(
                "flex-none text-[11px] leading-none font-semibold whitespace-nowrap text-brand outline-none",
                HIT_TARGET_ROW,
                focusRing.chip
              )}
            >
              {whyOpen ? "Hide ▴" : "Why ▾"}
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-4">
            <WhyItMoved
              attribution={attribution.attribution}
              currency={baseCurrency}
              mockId={attribution.mockId}
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {prices.isStale ? (
        <DegradedState
          headline={STALE_PRICES_HEADLINE}
          body={STALE_PRICES_BODY}
          footnote={PRICES_AS_OF_NOTE}
          {...mockAttributes(prices.mockId)}
        />
      ) : null}

      {holdings.isDegraded ? (
        <DegradedState
          headline="Some holdings have no price"
          body={ratelessNote(holdings.ratelessCount)}
        />
      ) : null}

      <CompositionPanel
        lens={lens}
        onLensChange={setLens}
        rows={rows}
        holdings={holdings}
        baseCurrency={baseCurrency}
        assetColors={assetColors}
        accountColors={accountColors}
      />

      <HoldingsTable
        summary={summary}
        period={periodColumn}
        colors={assetColors}
        currency={baseCurrency}
        expanded={expanded}
        onToggle={toggle}
        shown={allRows ? summary.rows.length : HOLDINGS_ROWS_DRAWN}
        onShowAll={() => {
          setAllRows(true)
        }}
      />

      <Footnote className="mt-0" {...mockAttributes(prices.mockId)}>
        {pricesAsOfLabel(formatDateTimeStamp(prices.asOf))} ·{" "}
        {PRICES_AS_OF_NOTE} {CASH_IN_TOTAL_NOTE} {LIFETIME_ONLY_NOTE}
      </Footnote>
    </div>
  )
}

function PortfolioMeta() {
  const userId = useUserId()
  const defaultAssetId = useRequiredBaseAssetId()
  const { data } = useHoldings({ userId, defaultAssetId })
  if (data === undefined) return null
  const assets = data.byAsset.length
  const accounts = data.byAccount.length
  return (
    <>
      {assets} {assets === 1 ? "asset" : "assets"} · {accounts}{" "}
      {accounts === 1 ? "account" : "accounts"}
    </>
  )
}

export function PortfolioScreen() {
  const [period, setPeriod] = usePeriodSearch()

  const changePeriod = (next: ChartPeriod) => {
    startTransition(() => {
      setPeriod(next)
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Investments"
        title="Portfolio"
        meta={<PortfolioMeta />}
      />
      <div className="flex flex-col gap-[26px]">
        <PortfolioHero period={period} onPeriodChange={changePeriod} />
        <PanelBoundary pending={<PortfolioBodySkeleton />}>
          <PortfolioBody period={period} />
        </PanelBoundary>
      </div>
    </>
  )
}
