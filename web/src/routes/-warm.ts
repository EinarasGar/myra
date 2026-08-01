import type { QueryClient } from "@tanstack/react-query"

import type { AuthSession } from "@/auth"
import { authMeQueryOptions } from "@/auth"
import { baseAssetIdOf } from "@/features/portfolio/api"
import type { UserId } from "@/lib/query"

export interface RouteContext {
  readonly queryClient: QueryClient
  readonly auth: AuthSession
}

export interface WarmScope {
  readonly queryClient: QueryClient
  readonly userId: UserId
  readonly defaultAssetId: number
}

/**
 * Loaders run on hover as well as on navigation, so a signed-out or half-booted
 * session resolves to `null` rather than throwing and turning a preload into a
 * route error.
 */
export async function warmScope(
  context: RouteContext
): Promise<WarmScope | null> {
  const userId = context.auth.userId
  if (userId === null) return null

  const me = await context.queryClient
    .ensureQueryData(authMeQueryOptions())
    .catch(() => undefined)

  const defaultAssetId = baseAssetIdOf(me)
  if (defaultAssetId === null) return null

  return { queryClient: context.queryClient, userId, defaultAssetId }
}
