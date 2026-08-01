import type {
  AccountAccountAccountTypeIdWithId,
  AssetAssetRequiredAssetTypeIdWithId,
  AssetPairInfo,
  CategoryRequiredCategoryTypeIdWithId,
} from "@/api"
import type {
  AccountId,
  AssetId,
  CategoryId,
  CategoryTypeId,
} from "@/lib/query"

import type { AccountClass } from "./accounts"
import { classifyAccountType, isLiabilityClass } from "./accounts"

/** Seeded asset type 1 is Currencies (`seed_reference_data.sql`). */
export const CURRENCY_ASSET_TYPE_ID = 1

/**
 * The single asset reference for the whole app. Descriptors are nullable because a
 * ledger row can name an asset the response's lookup table never carried, and a pair
 * endpoint returns no asset type at all — `assetLabel` is the only safe way to print
 * one.
 */
export interface AssetRef {
  readonly assetId: AssetId
  readonly ticker: string | null
  readonly name: string | null
  readonly assetTypeId: number | null
}

/** The single account reference for the whole app. Nullable for the same reason. */
export interface AccountRef {
  readonly accountId: AccountId
  readonly name: string | null
  readonly accountTypeId: number | null
  readonly accountClass: AccountClass
  readonly isLiability: boolean
}

/**
 * The single category shape. The ledger's lookup tables and the category catalogue
 * carry the same wire row, so one type serves both and a catalogue row can be handed
 * straight to anything holding a ledger row's category.
 */
export interface Category {
  readonly id: CategoryId
  readonly name: string
  readonly icon: string
  readonly typeId: CategoryTypeId
  readonly isGlobal: boolean
  readonly isSystem: boolean
}

export type AssetRefIndex = Record<AssetId, AssetRef | undefined>
export type AccountRefIndex = Record<AccountId, AccountRef | undefined>

export function toAssetRef(row: AssetAssetRequiredAssetTypeIdWithId): AssetRef {
  return {
    assetId: row.asset_id,
    ticker: row.ticker,
    name: row.name,
    assetTypeId: row.asset_type,
  }
}

/** A pair row carries no asset type, so currency cannot be decided from one. */
export function toAssetPairRef(row: AssetPairInfo): AssetRef {
  return {
    assetId: row.asset_id,
    ticker: row.ticker,
    name: row.name,
    assetTypeId: null,
  }
}

/**
 * Lookup tables carry the numeric account type only, so `accountTypeTaxonomy`'s
 * name-first guard cannot fire here and a re-seeded id would reclassify silently.
 */
export function toAccountRef(
  row: AccountAccountAccountTypeIdWithId
): AccountRef {
  const accountClass = classifyAccountType({ id: row.account_type })
  return {
    accountId: row.account_id,
    name: row.name,
    accountTypeId: row.account_type,
    accountClass,
    isLiability: isLiabilityClass(accountClass),
  }
}

export function toCategory(
  raw: CategoryRequiredCategoryTypeIdWithId
): Category {
  return {
    id: raw.id,
    name: raw.category,
    icon: raw.icon,
    typeId: raw.category_type,
    isGlobal: raw.is_global,
    isSystem: raw.is_system,
  }
}

export function unresolvedAssetRef(assetId: AssetId): AssetRef {
  return { assetId, ticker: null, name: null, assetTypeId: null }
}

export function unresolvedAccountRef(accountId: AccountId): AccountRef {
  const accountClass = classifyAccountType(null)
  return {
    accountId,
    name: null,
    accountTypeId: null,
    accountClass,
    isLiability: isLiabilityClass(accountClass),
  }
}

export function indexAssets(
  rows: readonly AssetAssetRequiredAssetTypeIdWithId[]
): AssetRefIndex {
  const index: AssetRefIndex = {}
  for (const row of rows) index[row.asset_id] = toAssetRef(row)
  return index
}

export function indexAccounts(
  rows: readonly AccountAccountAccountTypeIdWithId[]
): AccountRefIndex {
  const index: AccountRefIndex = {}
  for (const row of rows) index[row.account_id] = toAccountRef(row)
  return index
}

export function isCurrencyAssetType(
  assetTypeId: number | null | undefined
): boolean {
  return assetTypeId === CURRENCY_ASSET_TYPE_ID
}

export function isCurrencyAsset(asset: AssetRef): boolean {
  return isCurrencyAssetType(asset.assetTypeId)
}

export function assetLabel(asset: AssetRef): string {
  return asset.ticker ?? asset.name ?? `Asset ${String(asset.assetId)}`
}

/**
 * `assetLabel` prefers the ticker, which is the identifier and not the noun a user
 * recognises. Anywhere a second line or a wider slot exists, print the name instead so
 * "AAPL.NASDAQ" is never its own description.
 */
export function assetDisplayName(asset: AssetRef): string {
  const label = assetLabel(asset)
  if (asset.name === null || asset.name === "" || asset.name === label)
    return label
  return asset.name
}

export function accountLabel(account: AccountRef): string {
  return account.name ?? "Unknown account"
}
