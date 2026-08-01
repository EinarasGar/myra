import { useMemo, type ReactNode } from "react"

import { Figure } from "@/components/figure"
import { Panel, PanelFootnote } from "@/components/primitives"

import type { LedgerResult, NativeAmount } from "../api"
import { nativeFigureProps } from "../api"

import { sliceFootnote } from "./copy"
import { DAY_NET_FIGURE_LIMIT } from "./presentation"
import { loadedSlice, sliceRangeLabel } from "./slice"

function SliceLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] leading-none font-semibold tracking-[0.12em] text-ink-3 uppercase">
      {children}
    </span>
  )
}

function SliceNet({ amounts }: { amounts: readonly NativeAmount[] }) {
  const shown = amounts.slice(0, DAY_NET_FIGURE_LIMIT)
  if (shown.length === 0) {
    return <Figure value={null} size="md" emptyLabel="No currency entries" />
  }

  return (
    <span className="flex flex-wrap items-baseline gap-x-[14px] gap-y-[6px]">
      {shown.map((amount, index) => (
        <Figure
          key={amount.asset.assetId}
          {...nativeFigureProps(amount)}
          intent="gainLoss"
          sign="always"
          size={index === 0 ? "md" : "base"}
        />
      ))}
      {amounts.length > shown.length ? (
        <span className="text-[10.5px] leading-none text-ink-3">
          +{amounts.length - shown.length} more currencies
        </span>
      ) : null}
    </span>
  )
}

export function SlicePanel({ ledger }: { ledger: LedgerResult }) {
  const slice = useMemo(
    () => loadedSlice(ledger.rows, ledger.hasNextPage),
    [ledger.rows, ledger.hasNextPage]
  )
  if (slice === null) return null

  const isFiltered = ledger.plan.appliedTokens.length > 0
  const total = ledger.totalResults

  return (
    <Panel data-slot="slice-panel" className="mt-[14px]">
      <div className="flex flex-col gap-[13px] px-5 pt-[15px] pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-[9px]">
          <SliceLabel>Loaded so far</SliceLabel>
          <p
            data-slot="slice-scope"
            className="flex flex-wrap items-baseline gap-x-[6px] gap-y-[4px] text-[11.5px] leading-none text-ink-3"
          >
            <Figure
              value={slice.transactionCount}
              kind="plain"
              intent="meta"
              size="micro"
            />
            <span>{isFiltered ? "matching transactions" : "transactions"}</span>
            {total === undefined ? null : (
              <>
                <span>in</span>
                <Figure
                  value={ledger.loadedCount}
                  kind="plain"
                  intent="meta"
                  size="micro"
                />
                <span>of</span>
                <Figure value={total} kind="plain" intent="meta" size="micro" />
                <span>rows</span>
              </>
            )}
            <span aria-hidden>·</span>
            <span className="font-mono text-[10.5px] leading-none font-medium">
              {sliceRangeLabel(slice)}
            </span>
          </p>
        </div>

        <div className="flex flex-none flex-col gap-[9px] sm:items-end">
          <SliceLabel>Net of these rows</SliceLabel>
          <SliceNet amounts={slice.netByCurrency} />
        </div>
      </div>

      <PanelFootnote>{sliceFootnote(slice.excludesPartialDay)}</PanelFootnote>
    </Panel>
  )
}
