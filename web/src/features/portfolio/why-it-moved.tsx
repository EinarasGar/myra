import { ShareBar } from "@/components/chart"
import { Figure } from "@/components/figure"
import {
  Panel,
  PanelFootnote,
  PanelHeader,
  PanelNote,
  PanelTitle,
  Truncate,
} from "@/components/primitives"
import type { MockId, MockPortfolioAttribution } from "@/lib/mock"
import { mockAttributes, MockBadge } from "@/lib/mock"

import { ATTRIBUTION_BASIS_NOTE } from "./copy"

const NEUTRAL_BUCKETS = new Set(["contributions"])

function barColour(key: string, amount: number): string {
  if (NEUTRAL_BUCKETS.has(key)) return "var(--color-ink)"
  return amount < 0 ? "var(--color-negative)" : "var(--color-positive)"
}

export function WhyItMoved({
  attribution,
  currency,
  mockId,
}: {
  attribution: MockPortfolioAttribution
  currency: string
  mockId: MockId
}) {
  return (
    <Panel data-slot="why-it-moved" {...mockAttributes(mockId)}>
      <PanelHeader>
        <PanelTitle className="me-0 flex-none text-[13.5px]">
          Why it moved
        </PanelTitle>
        <PanelNote>{attribution.rangeLabel}</PanelNote>
        <span aria-hidden className="flex-1" />
        <MockBadge id={mockId} />
      </PanelHeader>

      <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
        {attribution.buckets.map((bucket) => (
          <div
            key={bucket.key}
            data-slot="attribution-bucket"
            data-bucket={bucket.key}
            className="bg-surface px-[18px] pt-[15px] pb-4"
          >
            <div className="text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase">
              {bucket.label}
            </div>
            <Figure
              value={bucket.amount}
              currency={currency}
              intent={NEUTRAL_BUCKETS.has(bucket.key) ? "neutral" : "gainLoss"}
              size="md"
              sign="always"
              className="mt-[11px] block text-[19px] tracking-[-0.02em]"
            />
            <ShareBar
              value={bucket.sharePercent / 100}
              color={barColour(bucket.key, bucket.amount)}
              label={`${bucket.label} is ${String(bucket.sharePercent)}% of the largest bucket`}
              className="mt-3"
            />
            <p className="mt-[10px] text-[11px] leading-[1.4] text-pretty text-ink-3">
              {bucket.note}
            </p>
          </div>
        ))}
      </div>

      <div className="grid border-t border-border bg-surface-2 md:grid-cols-3">
        {attribution.subtotals.map((subtotal) => (
          <div
            key={subtotal.key}
            data-slot="attribution-subtotal"
            className="min-w-0 border-b border-border px-[18px] py-[13px] md:border-e md:border-b-0"
          >
            <div className="flex items-baseline gap-[9px]">
              <span className="text-[12px] leading-none font-semibold whitespace-nowrap">
                {subtotal.label}
              </span>
              <Figure
                value={subtotal.amount}
                currency={currency}
                intent="gainLoss"
                size="base"
                sign="always"
                className="text-[13.5px] font-semibold"
              />
            </div>
            <Truncate
              text={subtotal.formula}
              className="mt-[7px] block font-mono text-[10.5px] leading-[1.4] text-ink-3"
            />
          </div>
        ))}
        <div
          data-slot="attribution-net"
          className="min-w-0 px-[18px] py-[13px]"
        >
          <div className="flex items-baseline gap-[9px]">
            <span className="text-[12px] leading-none font-bold whitespace-nowrap">
              Net change
            </span>
            <Figure
              value={attribution.total}
              currency={currency}
              intent="gainLoss"
              size="base"
              sign="always"
              className="text-[13.5px] font-bold"
            />
          </div>
          <Truncate
            text={attribution.netFormula}
            className="mt-[7px] block font-mono text-[10.5px] leading-[1.4] text-ink-3"
          />
        </div>
      </div>

      <PanelFootnote>
        {ATTRIBUTION_BASIS_NOTE} {attribution.footnote}
      </PanelFootnote>
    </Panel>
  )
}
