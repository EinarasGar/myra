import { registerAuthTokenGetter } from "@/lib/api"

import { provideAuthTokens, resolveAuthToken } from "./tokens"
import type { AuthTokenProvider } from "./types"

// Deliberately runs during render: child effects fire before parent effects, so
// registering in an effect would land after descendants have already dispatched
// their first queries. `undefined` means the provider is still resolving.
export function useAuthTransport(
  provider: AuthTokenProvider | null | undefined
): void {
  registerAuthTokenGetter(resolveAuthToken)
  if (provider !== undefined) {
    provideAuthTokens(provider)
  }
}
