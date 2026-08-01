import type { AllocationSegment } from "@/components/chart"
import type { HoldingsView } from "@/features/portfolio/api"
import { accountLabel } from "@/lib/domain/refs"

import type { PortfolioHoldingRow } from "./holdings"

export const COMPOSITION_LENSES = ["assets", "accounts", "currency"] as const

export type CompositionLens = (typeof COMPOSITION_LENSES)[number]

export const COMPOSITION_LENS_LABELS: Record<CompositionLens, string> = {
  assets: "Assets",
  accounts: "Accounts",
  currency: "Currency",
}

export const DEFAULT_COMPOSITION_LENS: CompositionLens = "assets"

export function readLens(raw: string | undefined): CompositionLens {
  return (
    COMPOSITION_LENSES.find((lens) => lens === raw) ?? DEFAULT_COMPOSITION_LENS
  )
}

export function writeLens(lens: CompositionLens): string | undefined {
  return lens === DEFAULT_COMPOSITION_LENS ? undefined : lens
}

export const NON_CASH_SEGMENT_KEY = "composition:non-cash"

export interface Composition {
  lens: CompositionLens
  segments: AllocationSegment[]
  note: string
  /** True when the lens cannot answer its own question for part of the value. */
  isPartial: boolean
}

function shareNote(rows: readonly PortfolioHoldingRow[]): string {
  const largest = rows[0]
  if (largest === undefined) return "nothing is held yet"
  const percent = Math.round(largest.share * 1000) / 10
  return `largest holding is ${String(percent)}% of the portfolio`
}

export function buildComposition(
  lens: CompositionLens,
  rows: readonly PortfolioHoldingRow[],
  holdings: HoldingsView,
  baseCurrency: string
): Composition {
  if (lens === "accounts") {
    return {
      lens,
      segments: holdings.byAccount.map((entry) => ({
        key: entry.accountId,
        label:
          entry.account === null
            ? "Unknown account"
            : accountLabel(entry.account),
        value: entry.value,
      })),
      note: `by value in ${baseCurrency}`,
      isPartial: false,
    }
  }

  if (lens === "currency") {
    const cash = rows.filter((row) => row.isCash && row.value > 0)
    const nonCash = rows
      .filter((row) => !row.isCash)
      .reduce((total, row) => total + row.value, 0)
    const segments: AllocationSegment[] = cash.map((row) => ({
      key: row.key,
      label: row.label,
      value: row.value,
    }))
    if (nonCash > 0) {
      segments.push({
        key: NON_CASH_SEGMENT_KEY,
        label: "Holdings that are not cash",
        value: nonCash,
      })
    }
    return {
      lens,
      segments,
      note: `cash split by its own currency, converted to ${baseCurrency}`,
      isPartial: nonCash > 0,
    }
  }

  return {
    lens,
    segments: rows.map((row) => ({
      key: row.key,
      label: row.label,
      value: row.value,
    })),
    note: shareNote(rows),
    isPartial: false,
  }
}
