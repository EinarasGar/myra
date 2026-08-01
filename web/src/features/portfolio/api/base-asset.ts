import { useSuspenseQuery } from "@tanstack/react-query"

import type { AuthMe } from "@/api"
import { authMeQueryOptions } from "@/auth"

/**
 * Every portfolio endpoint denominates in `default_asset_id`, but `useBaseCurrency()`
 * gives the ticker. The id lives on the same `/auth/me` payload the auth layer has
 * already fetched, so this reads that cache entry rather than issuing a request.
 */
export function baseAssetIdOf(me: AuthMe | undefined): number | null {
  return me?.default_asset?.id ?? null
}

export function useBaseAssetId(): number | null {
  return baseAssetIdOf(useSuspenseQuery(authMeQueryOptions()).data)
}

/** For screens rendered behind the onboarding guard, where a base currency is set. */
export function useRequiredBaseAssetId(): number {
  const assetId = useBaseAssetId()
  if (assetId === null) {
    throw new Error(
      "This account has no base currency. Render portfolio figures behind the onboarding guard, or use useBaseAssetId() and handle null."
    )
  }
  return assetId
}
