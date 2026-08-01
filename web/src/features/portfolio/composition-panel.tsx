import type { SeriesColors } from "@/components/chart"
import { AllocationBar } from "@/components/chart"
import { SectionHeader, SegmentedControl } from "@/components/primitives"
import type { HoldingsView } from "@/features/portfolio/api"

import type { CompositionLens } from "./composition"
import {
  buildComposition,
  COMPOSITION_LENS_LABELS,
  COMPOSITION_LENSES,
} from "./composition"
import { CURRENCY_LENS_NOTE } from "./copy"
import type { PortfolioHoldingRow } from "./holdings"

const LENS_OPTIONS = COMPOSITION_LENSES.map((lens) => ({
  value: lens,
  label: COMPOSITION_LENS_LABELS[lens],
}))

export interface CompositionPanelProps {
  lens: CompositionLens
  onLensChange: (lens: CompositionLens) => void
  rows: readonly PortfolioHoldingRow[]
  holdings: HoldingsView
  baseCurrency: string
  assetColors: SeriesColors
  accountColors: SeriesColors
}

export function CompositionPanel({
  lens,
  onLensChange,
  rows,
  holdings,
  baseCurrency,
  assetColors,
  accountColors,
}: CompositionPanelProps) {
  const composition = buildComposition(lens, rows, holdings, baseCurrency)
  const colors = lens === "accounts" ? accountColors : assetColors

  return (
    <section data-slot="composition" data-lens={lens}>
      <SectionHeader
        label="Composition"
        note={composition.note}
        action={
          <SegmentedControl
            value={lens}
            onValueChange={onLensChange}
            options={LENS_OPTIONS}
            label="Composition lens"
            size="sm"
          />
        }
        className="gap-[11px]"
      />
      <AllocationBar
        segments={composition.segments}
        colors={colors}
        label={`Composition by ${COMPOSITION_LENS_LABELS[lens].toLowerCase()}`}
      />
      {composition.isPartial ? (
        <p className="mt-3 text-[11px] leading-[1.5] text-pretty text-ink-3">
          {CURRENCY_LENS_NOTE}
        </p>
      ) : null}
    </section>
  )
}
