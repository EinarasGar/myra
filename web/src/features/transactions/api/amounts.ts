import type { AssetRef } from "@/lib/domain/refs"
import { assetLabel, isCurrencyAsset } from "@/lib/domain/refs"
import type { AssetId } from "@/lib/query"

import type { LegDirection, NativeAmount } from "./types"
import { assetUnitsOf, nativeAmount } from "./types"

export function legDirection(amount: number): LegDirection {
  if (amount > 0) return "in"
  if (amount < 0) return "out"
  return "flat"
}

export function nativeDirection(amount: NativeAmount): LegDirection {
  return legDirection(assetUnitsOf(amount))
}

export type NativeFigureProps =
  | {
      readonly value: number
      readonly kind: "money"
      readonly currency: string
    }
  | { readonly value: number; readonly kind: "units"; readonly ticker: string }

/**
 * The only supported way to hand a ledger amount to `<Figure>`: money keeps the asset's
 * ticker as its currency so a native figure can never be read as a base-currency one.
 */
export function nativeFigureProps(amount: NativeAmount): NativeFigureProps {
  const label = assetLabel(amount.asset)
  const value = assetUnitsOf(amount)
  if (isCurrencyAsset(amount.asset)) {
    return { value, kind: "money", currency: label }
  }
  return { value, kind: "units", ticker: label }
}

export function sumByAsset(
  amounts: readonly NativeAmount[]
): readonly NativeAmount[] {
  const totals = new Map<AssetId, { total: number; asset: AssetRef }>()
  for (const amount of amounts) {
    const existing = totals.get(amount.asset.assetId)
    if (existing === undefined) {
      totals.set(amount.asset.assetId, {
        total: assetUnitsOf(amount),
        asset: amount.asset,
      })
      continue
    }
    existing.total += assetUnitsOf(amount)
  }

  return [...totals.values()]
    .map((entry) => nativeAmount(entry.total, entry.asset))
    .sort((a, b) => Math.abs(assetUnitsOf(b)) - Math.abs(assetUnitsOf(a)))
}
