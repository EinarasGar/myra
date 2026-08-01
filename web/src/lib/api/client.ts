import type { AxiosInstance } from "axios"
import globalAxios from "axios"

import { normalizeError } from "@/lib/errors"
import type { NormalizedNetworkError } from "@/lib/errors"

import { API_BASE_URL, GENERATED_BASE_PATH } from "./config"
import { getAuthToken, notifyUnauthorized } from "./credentials"

const REQUEST_TIMEOUT_MS = 30_000

export const apiClient: AxiosInstance = globalAxios.create({
  baseURL: API_BASE_URL === "" ? undefined : API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: "application/json" },
})

// Failing to obtain a credential is not the server rejecting one: it must never be
// reported as a 401, or a hiccup in the identity provider signs the user out.
function credentialUnavailable(cause: unknown): NormalizedNetworkError {
  return {
    kind: "network",
    reason: "unreachable",
    message: "We couldn't confirm your sign-in. Check your connection.",
    cause,
  }
}

apiClient.interceptors.request.use(async (config) => {
  let token: string | null
  try {
    token = await getAuthToken()
  } catch (cause) {
    return Promise.reject(credentialUnavailable(cause))
  }
  if (token !== null) config.headers.set("Authorization", `Bearer ${token}`)
  return config
})

apiClient.interceptors.response.use(undefined, (error: unknown) => {
  const normalized = normalizeError(error)
  if (normalized.kind === "unauthorized") notifyUnauthorized(normalized)
  return Promise.reject(normalized)
})

// The generated client falls back to its hardcoded http://localhost:5000 whenever it is
// invoked without our instance; failing loudly beats silently talking to the wrong host.
globalAxios.interceptors.request.use((config) => {
  const url = config.url ?? ""
  const base = config.baseURL ?? ""
  if (
    !url.startsWith(GENERATED_BASE_PATH) &&
    !base.startsWith(GENERATED_BASE_PATH)
  ) {
    return config
  }
  throw new Error(
    "A generated API factory was called without the Sverto axios instance and would have " +
      `requested ${GENERATED_BASE_PATH}. Use api(SomeApiFactory) from @/lib/api instead.`
  )
})
