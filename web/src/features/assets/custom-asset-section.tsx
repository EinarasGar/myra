import { startTransition, useMemo, useState } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { useUserId } from "@/auth"
import type { ChartPeriod, ChartPoint } from "@/components/chart"
import { HeroChart, HeroChartSkeleton } from "@/components/chart"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import type { PickerOption } from "@/components/primitives"
import {
  EntityPicker,
  Panel,
  PanelBody,
  SectionHeader,
  Truncate,
} from "@/components/primitives"
import { EmptyState } from "@/components/states/empty-state"
import { LoadingState, SkeletonBar } from "@/components/states/loading-state"
import { DegradedState } from "@/components/states/message-state"
import { Button } from "@/components/ui/button"
import type { AssetRef } from "@/lib/domain/refs"
import { assetDisplayName, assetLabel } from "@/lib/domain/refs"
import { formatDateStamp } from "@/lib/format"

import type { AssetDetail, AssetQuote } from "./api"
import {
  userAssetPairQueryOptions,
  userAssetPairRatesQueryOptions,
  userAssetQueryOptions,
} from "./api"
import { ExchangeField } from "./exchange-field"
import { AddPairDialog, DeletePairDialog } from "./pair-dialogs"
import { AddValuationDialog } from "./valuation-dialog"
import { ValuationHistory } from "./valuation-history"
import {
  ADD_VALUATION_LABEL,
  daysSinceValuation,
  isStaleValuation,
  lastValuedLine,
  PAIR_NONE_BODY,
  PAIR_NONE_HEADLINE,
  staleValuationBody,
  staleValuationHeadline,
  VALUATION_NEVER_HEADLINE,
  valuationNeverBody,
} from "./valuation"

export const VALUATIONS_LABEL = "Your valuations"
export const VALUATIONS_NOTE = "you price this asset, nobody else does"

/** You value a flat once or twice a year, so the shared 1-month default shows nothing. */
export const VALUATION_PERIOD: ChartPeriod = "all"

/** The shared chart needs two points to draw a line, so one valuation is not a failure. */
function chartEmptyLabel(
  count: number,
  quote: AssetQuote | null,
  now: Date
): string {
  if (count === 1) return "One valuation so far — a second draws the line"
  if (quote === null) return "Never valued — add one to start the line"
  return `Nothing in this window — your most recent is ${formatDateStamp(quote.asOf, { year: "always", now })}`
}

function pairOption(asset: AssetRef): PickerOption {
  const label = assetLabel(asset)
  const name = assetDisplayName(asset)
  return {
    value: String(asset.assetId),
    label,
    ...(name === label ? {} : { subLabel: name }),
  }
}

function PairBar({
  detail,
  reference,
  onSelect,
  onAdd,
  onRemove,
}: {
  detail: AssetDetail
  reference: AssetRef
  onSelect: (assetId: number) => void
  onAdd: () => void
  onRemove: () => void
}) {
  return (
    <Panel data-slot="pair-bar">
      <PanelBody
        dense
        className="flex flex-wrap items-end gap-x-3 gap-y-[14px]"
      >
        <div className="min-w-[min(100%,190px)] flex-1">
          <div className="mb-2 text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
            Priced in
          </div>
          {detail.pairs.length < 2 ? (
            <Truncate
              text={assetDisplayName(reference)}
              className="block h-9 text-[12.5px] leading-9 font-medium"
            />
          ) : (
            <EntityPicker
              size="sm"
              label="Reference asset"
              value={String(reference.assetId)}
              placeholder="Choose a pair"
              options={detail.pairs.map(pairOption)}
              onValueChange={(next) => {
                if (next !== null) onSelect(Number(next))
              }}
            />
          )}
        </div>
        <ExchangeField
          key={reference.assetId}
          assetId={detail.assetId}
          referenceId={reference.assetId}
        />
        <div className="flex flex-none items-center gap-[6px] pb-[7px]">
          <Button variant="outline" size="xs" onClick={onAdd}>
            <Plus aria-hidden className="size-3" />
            Add pair
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="text-ink-3 hover:text-negative"
            onClick={onRemove}
          >
            Remove pair
          </Button>
        </div>
      </PanelBody>
    </Panel>
  )
}

function ValuationBody({
  assetId,
  reference,
  ticker,
  period,
  onPeriodChange,
  withChart,
  onAdd,
}: {
  assetId: number
  reference: AssetRef
  ticker: string
  period: ChartPeriod
  onPeriodChange: (next: ChartPeriod) => void
  withChart: boolean
  onAdd: () => void
}) {
  const userId = useUserId()
  const referenceTicker = assetLabel(reference)
  const pair = useSuspenseQuery(
    userAssetPairQueryOptions(userId, assetId, reference.assetId)
  ).data
  const rates = useSuspenseQuery(
    userAssetPairRatesQueryOptions(userId, assetId, reference.assetId, period)
  ).data

  const points = useMemo<ChartPoint[]>(
    () => rates.map((point) => ({ date: point.date, value: point.rate })),
    [rates]
  )

  const now = new Date()
  const quote = pair.quote
  const age = quote === null ? null : daysSinceValuation(quote.asOf, now)
  const stale = age !== null && isStaleValuation(age)
  const staleBody =
    quote === null ? null : staleValuationBody(ticker, quote.asOf, now)

  return (
    <div className="flex flex-col gap-[18px]">
      {quote === null ? (
        <DegradedState
          headline={VALUATION_NEVER_HEADLINE}
          body={valuationNeverBody(ticker)}
          actions={[
            { label: ADD_VALUATION_LABEL, onClick: onAdd, kind: "primary" },
          ]}
        />
      ) : null}

      {/* The chart owns the stale signal wherever it is drawn, so it is never said twice. */}
      {stale && !withChart && staleBody !== null && quote !== null ? (
        <DegradedState
          headline={staleValuationHeadline(quote.asOf, now)}
          body={staleBody}
          actions={[
            { label: ADD_VALUATION_LABEL, onClick: onAdd, kind: "primary" },
          ]}
        />
      ) : null}

      {withChart ? (
        <HeroChart
          data={points}
          currency={referenceTicker}
          label={`${ticker} in ${referenceTicker}`}
          size="tall"
          period={period}
          onPeriodChange={onPeriodChange}
          emptyLabel={chartEmptyLabel(points.length, quote, now)}
          note={
            quote === null ? "never valued" : lastValuedLine(quote.asOf, now)
          }
          {...(stale && staleBody !== null ? { degraded: staleBody } : {})}
        />
      ) : null}

      <ValuationHistory
        assetId={assetId}
        referenceId={reference.assetId}
        referenceTicker={referenceTicker}
        rates={rates}
        hasPeriodControl={withChart}
        onAdd={onAdd}
      />
    </div>
  )
}

function ValuationSkeleton({ withChart }: { withChart: boolean }) {
  if (withChart) {
    return <HeroChartSkeleton size="tall" label="Loading your valuations" />
  }
  return (
    <LoadingState label="Loading your valuations">
      <SkeletonBar width={180} height={12} anchor />
      <SkeletonBar width="100%" height={10} />
      <SkeletonBar width="100%" height={10} />
    </LoadingState>
  )
}

function SectionSkeleton({ withChart }: { withChart: boolean }) {
  return (
    <section data-slot="custom-asset-valuations">
      <SectionHeader label={VALUATIONS_LABEL} note={VALUATIONS_NOTE} />
      <ValuationSkeleton withChart={withChart} />
    </section>
  )
}

export function CustomAssetPanel({
  assetId,
  withChart,
}: {
  assetId: number
  withChart: boolean
}) {
  return (
    <PanelBoundary pending={<SectionSkeleton withChart={withChart} />}>
      <CustomAssetSection assetId={assetId} withChart={withChart} />
    </PanelBoundary>
  )
}

/**
 * A custom asset has no market data behind it, so this section is the only thing that can
 * move its value. It renders whether or not the asset is held: an unheld one still needs a
 * rate before it can ever be worth anything.
 */
export function CustomAssetSection({
  assetId,
  withChart,
}: {
  assetId: number
  withChart: boolean
}) {
  const userId = useUserId()
  const detail = useSuspenseQuery(userAssetQueryOptions(userId, assetId)).data
  const [chosen, setChosen] = useState<number | null>(null)
  const [period, setPeriod] = useState<ChartPeriod>(VALUATION_PERIOD)
  const [adding, setAdding] = useState(false)
  const [addingPair, setAddingPair] = useState(false)
  const [removingPair, setRemovingPair] = useState(false)

  const fallback = detail.baseAsset ?? detail.pairs[0] ?? null
  const reference =
    detail.pairs.find((pair) => pair.assetId === chosen) ?? fallback

  const openAdd = () => {
    setAdding(true)
  }

  const changePeriod = (next: ChartPeriod) => {
    startTransition(() => {
      setPeriod(next)
    })
  }

  return (
    <section data-slot="custom-asset-valuations">
      <SectionHeader
        label={VALUATIONS_LABEL}
        note={VALUATIONS_NOTE}
        action={
          reference === null ? null : (
            <Button
              variant="ghost"
              size="xs"
              className="text-brand hover:text-brand"
              onClick={openAdd}
            >
              <Plus aria-hidden className="size-3" />
              {ADD_VALUATION_LABEL}
            </Button>
          )
        }
      />

      {reference === null ? (
        <EmptyState
          headline={PAIR_NONE_HEADLINE}
          body={PAIR_NONE_BODY}
          actions={[
            {
              label: "Add a pair",
              kind: "primary",
              onClick: () => {
                setAddingPair(true)
              },
            },
          ]}
        />
      ) : (
        <div className="flex flex-col gap-[18px]">
          <PairBar
            detail={detail}
            reference={reference}
            onSelect={setChosen}
            onAdd={() => {
              setAddingPair(true)
            }}
            onRemove={() => {
              setRemovingPair(true)
            }}
          />
          <PanelBoundary pending={<ValuationSkeleton withChart={withChart} />}>
            <ValuationBody
              assetId={assetId}
              reference={reference}
              ticker={detail.ticker}
              period={period}
              onPeriodChange={changePeriod}
              withChart={withChart}
              onAdd={openAdd}
            />
          </PanelBoundary>
        </div>
      )}

      {adding && reference !== null ? (
        <AddValuationDialog
          assetId={assetId}
          referenceId={reference.assetId}
          ticker={detail.ticker}
          referenceTicker={assetLabel(reference)}
          onOpenChange={setAdding}
        />
      ) : null}

      {addingPair ? (
        <AddPairDialog
          assetId={assetId}
          ticker={detail.ticker}
          existing={detail.pairs}
          onOpenChange={setAddingPair}
          onAdded={setChosen}
        />
      ) : null}

      <DeletePairDialog
        assetId={assetId}
        reference={removingPair ? reference : null}
        onOpenChange={(open) => {
          if (!open) setRemovingPair(false)
        }}
        onDeleted={() => {
          setChosen(null)
        }}
      />
    </section>
  )
}
