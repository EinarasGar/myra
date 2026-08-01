import type { HoldingsMetadataLookupTables } from "@/api"
import type { AccountRefIndex, AssetRefIndex } from "@/lib/domain/refs"
import { indexAccounts, indexAssets } from "@/lib/domain/refs"

/**
 * Lookup tables are normalised out of the response that carried them and stay in
 * that query's cache entry. They are never written to a store — a sparse table
 * from one endpoint must not overwrite a richer one from another.
 */
export interface PortfolioLookups {
  assetsById: AssetRefIndex
  accountsById: AccountRefIndex
}

export function toPortfolioLookups(
  tables: HoldingsMetadataLookupTables
): PortfolioLookups {
  return {
    assetsById: indexAssets(tables.assets),
    accountsById: indexAccounts(tables.accounts),
  }
}
