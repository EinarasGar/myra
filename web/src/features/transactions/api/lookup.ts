import type { MetadataLookupTables } from "@/api"
import type { AccountRef, AssetRef, Category } from "@/lib/domain/refs"
import {
  toAccountRef,
  toAssetRef,
  toCategory,
  unresolvedAccountRef,
  unresolvedAssetRef,
} from "@/lib/domain/refs"
import type { AccountId, AssetId, CategoryId } from "@/lib/query"

export interface LookupIndex {
  readonly accounts: ReadonlyMap<AccountId, AccountRef>
  readonly assets: ReadonlyMap<AssetId, AssetRef>
  readonly categories: ReadonlyMap<CategoryId, Category>
  readonly categoriesProvided: boolean
}

export const EMPTY_LOOKUP: LookupIndex = {
  accounts: new Map(),
  assets: new Map(),
  categories: new Map(),
  categoriesProvided: false,
}

export function toLookupIndex(tables: MetadataLookupTables): LookupIndex {
  const accounts = new Map<AccountId, AccountRef>()
  for (const account of tables.accounts) {
    accounts.set(account.account_id, toAccountRef(account))
  }

  const assets = new Map<AssetId, AssetRef>()
  for (const asset of tables.assets) {
    assets.set(asset.asset_id, toAssetRef(asset))
  }

  const categories = new Map<CategoryId, Category>()
  for (const category of tables.categories ?? []) {
    categories.set(category.id, toCategory(category))
  }

  return {
    accounts,
    assets,
    categories,
    categoriesProvided: tables.categories !== undefined,
  }
}

/**
 * Later pages win. web_old kept the first observation of every entity forever, so a
 * placeholder row from one lookup table permanently shadowed the richer one (oldApp.md
 * pitfall 1).
 */
export function mergeLookupIndexes(
  indexes: readonly LookupIndex[]
): LookupIndex {
  const accounts = new Map<AccountId, AccountRef>()
  const assets = new Map<AssetId, AssetRef>()
  const categories = new Map<CategoryId, Category>()
  let categoriesProvided = false

  for (const index of indexes) {
    for (const [id, account] of index.accounts) accounts.set(id, account)
    for (const [id, asset] of index.assets) assets.set(id, asset)
    for (const [id, category] of index.categories) categories.set(id, category)
    if (index.categoriesProvided) categoriesProvided = true
  }

  return { accounts, assets, categories, categoriesProvided }
}

export function resolveAsset(lookup: LookupIndex, assetId: AssetId): AssetRef {
  return lookup.assets.get(assetId) ?? unresolvedAssetRef(assetId)
}

export function resolveAccount(
  lookup: LookupIndex,
  accountId: AccountId
): AccountRef {
  return lookup.accounts.get(accountId) ?? unresolvedAccountRef(accountId)
}

export function resolveCategory(
  lookup: LookupIndex,
  categoryId: CategoryId
): Category | null {
  return lookup.categories.get(categoryId) ?? null
}
