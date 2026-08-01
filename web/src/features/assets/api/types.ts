import type {
  AssetPairMetadata,
  AssetRate,
  AssetType,
  GetAssetResponse,
} from "@/api"
import type { AssetRef } from "@/lib/domain/refs"
import { toAssetPairRef } from "@/lib/domain/refs"
import type { AssetId } from "@/lib/query"

export interface AssetTypeRef {
  readonly id: number
  readonly name: string
}

export interface AssetDetail {
  readonly assetId: AssetId
  readonly ticker: string
  readonly name: string
  readonly assetType: AssetTypeRef
  readonly baseAsset: AssetRef | null
  readonly pairs: readonly AssetRef[]
}

export interface AssetQuote {
  readonly rate: number
  readonly asOf: Date
}

export interface RatePoint {
  readonly date: Date
  readonly rate: number
}

export function toAssetTypeRef(raw: AssetType): AssetTypeRef {
  return { id: raw.id, name: raw.name }
}

export function toAssetDetail(
  assetId: AssetId,
  raw: GetAssetResponse
): AssetDetail {
  return {
    assetId,
    ticker: raw.ticker,
    name: raw.name,
    assetType: toAssetTypeRef(raw.asset_type),
    baseAsset: raw.base_asset ? toAssetPairRef(raw.base_asset) : null,
    pairs: raw.pairs.map(toAssetPairRef),
  }
}

/** Timestamps on the wire are unix seconds (`time::serde::timestamp`). */
export function fromUnixSeconds(seconds: number): Date {
  return new Date(seconds * 1000)
}

/**
 * The server flattens an `Option<AssetPairMetadata>`, so a pair with no rate path
 * comes back as `{}` even though the generated type declares both fields required.
 * Anything without both fields is "no quote", never a zero rate.
 */
export function toAssetQuote(
  raw: Partial<AssetPairMetadata> | null | undefined
): AssetQuote | null {
  if (
    raw === null ||
    raw === undefined ||
    typeof raw.latest_rate !== "number" ||
    typeof raw.last_updated !== "number"
  ) {
    return null
  }
  return { rate: raw.latest_rate, asOf: fromUnixSeconds(raw.last_updated) }
}

export function toRatePoints(raw: readonly AssetRate[]): RatePoint[] {
  return raw.map((point) => ({
    date: fromUnixSeconds(point.date),
    rate: point.rate,
  }))
}
