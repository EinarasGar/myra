import type { AuthMe } from "@/api"

export const CURRENT_ONBOARDING_VERSION = 1

export function needsOnboarding(me: AuthMe | undefined): boolean {
  if (me === undefined) return false
  if (me.onboarding_version < CURRENT_ONBOARDING_VERSION) return true
  return me.default_asset === null || me.default_asset === undefined
}

export function isSafeRedirect(target: string | undefined): boolean {
  if (!target) return false
  return target.startsWith("/") && !target.startsWith("//")
}
