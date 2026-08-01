import {
  isAxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios"

import { AuthenticationApiFactory, type LoginDetails } from "@/api"
import { api } from "@/lib/api"
import { isNormalizedError } from "@/lib/errors"

const ACCESS_TOKEN_STORAGE_KEY = "sverto.auth.access-token"
const REFRESH_PATH = "/api/auth/refresh"

type RetriableConfig = InternalAxiosRequestConfig & { authRetried?: boolean }

const listeners = new Set<() => void>()
let accessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
let refreshInFlight: Promise<string | null> | null = null
let refreshInterceptorInstalled = false

function authApi() {
  return api(AuthenticationApiFactory)
}

function setAccessToken(token: string | null): void {
  accessToken = token
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  }
  for (const listener of listeners) listener()
}

export function getAccessToken(): string | null {
  return accessToken
}

export function subscribeToAccessToken(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function signInWithPassword(
  credentials: LoginDetails
): Promise<void> {
  const response = await authApi().postLoginDetails(credentials, {
    withCredentials: true,
  })
  setAccessToken(response.data.token)
}

export async function signOutFromDatabase(): Promise<void> {
  await authApi()
    .postLogout({ withCredentials: true })
    .catch(() => null)
  setAccessToken(null)
}

function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= authApi()
    .postRefreshToken({ withCredentials: true })
    .then((response) => {
      setAccessToken(response.data.token)
      return response.data.token
    })
    .catch(() => {
      setAccessToken(null)
      return null
    })
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

// The api client normalises errors before this handler sees them, so the original
// AxiosError — the only carrier of the request config we need to replay — arrives
// as `cause`.
function unauthorizedRequestOf(error: unknown): RetriableConfig | null {
  const source = isAxiosError(error)
    ? error
    : isNormalizedError(error) && isAxiosError(error.cause)
      ? error.cause
      : null
  if (source?.response?.status !== 401) return null
  return source.config ?? null
}

function retriableRequestOf(error: unknown): RetriableConfig | null {
  const request = unauthorizedRequestOf(error)
  if (!request || request.authRetried || request.url?.includes(REFRESH_PATH)) {
    return null
  }
  return request
}

export function isRefreshExhausted(error: unknown): boolean {
  const request = unauthorizedRequestOf(error)
  if (!request) return false
  return (
    request.authRetried === true || Boolean(request.url?.includes(REFRESH_PATH))
  )
}

export function ensureDatabaseRefreshInterceptor(client: AxiosInstance): void {
  if (refreshInterceptorInstalled) return
  refreshInterceptorInstalled = true
  client.interceptors.response.use(undefined, async (error: unknown) => {
    const request = retriableRequestOf(error)
    if (!request) throw error

    request.authRetried = true
    if (!(await refreshAccessToken())) throw error
    return client.request(request)
  })
}
