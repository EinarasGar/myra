import type { NormalizedUnauthorizedError } from "@/lib/errors"

export type AuthTokenGetter = () => string | null | Promise<string | null>

export type UnauthorizedHandler = (error: NormalizedUnauthorizedError) => void

let tokenGetter: AuthTokenGetter | null = null
const unauthorizedHandlers = new Set<UnauthorizedHandler>()

export function registerAuthTokenGetter(getter: AuthTokenGetter): () => void {
  tokenGetter = getter
  return () => {
    if (tokenGetter === getter) tokenGetter = null
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (tokenGetter === null) return null
  return (await tokenGetter()) ?? null
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  return token === null ? {} : { Authorization: `Bearer ${token}` }
}

export function registerUnauthorizedHandler(
  handler: UnauthorizedHandler
): () => void {
  unauthorizedHandlers.add(handler)
  return () => {
    unauthorizedHandlers.delete(handler)
  }
}

export function notifyUnauthorized(error: NormalizedUnauthorizedError): void {
  for (const handler of unauthorizedHandlers) handler(error)
}
