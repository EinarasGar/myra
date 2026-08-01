import type { AuthTokenProvider } from "./types"

export const AUTH_TOKEN_DEADLINE_MS = 8_000

export class AuthTokenUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "AuthTokenUnavailableError"
  }
}

let tokenProvider: AuthTokenProvider | null = null
let markSettled!: () => void

// Requests must not leave before the active provider has decided whether it can
// supply a credential, otherwise the first calls of a session race the token and
// come back 401. Callers await this gate instead of the app ordering renders.
const settled = new Promise<void>((resolve) => {
  markSettled = resolve
})

export function provideAuthTokens(provider: AuthTokenProvider | null): void {
  tokenProvider = provider
  markSettled()
}

export async function resolveAuthToken(): Promise<string | null> {
  return withDeadline(readToken())
}

async function readToken(): Promise<string | null> {
  await settled
  return tokenProvider ? tokenProvider() : null
}

function withDeadline<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new AuthTokenUnavailableError(
          `The authentication provider did not supply a credential within ${AUTH_TOKEN_DEADLINE_MS}ms.`
        )
      )
    }, AUTH_TOKEN_DEADLINE_MS)
  })

  return Promise.race([work, deadline]).finally(() => {
    clearTimeout(timer)
  })
}
