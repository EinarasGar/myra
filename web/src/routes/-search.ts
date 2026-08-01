import { z } from "zod"

/**
 * Every search param is written by hand at some point — from a shared link, a bookmark or
 * the address bar — so each one falls back to "not set" instead of failing the route.
 */
export const optionalText = z.string().optional().catch(undefined)

export function optionalEnum<const T extends readonly [string, ...string[]]>(
  values: T
) {
  return z.enum(values).optional().catch(undefined)
}
