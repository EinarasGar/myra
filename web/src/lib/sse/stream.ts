import { getAuthHeaders, resolveApiUrl } from "@/lib/api"
import {
  isRetryableError,
  normalizeError,
  normalizeHttpError,
  normalizeTransportError,
} from "@/lib/errors"

import type { SseMessage } from "./parser"
import { readSseStream } from "./parser"

interface SseReconnectPolicy {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
}

const DEFAULT_RECONNECT_POLICY: SseReconnectPolicy = {
  maxAttempts: 5,
  initialDelayMs: 1_000,
  maxDelayMs: 15_000,
}

export interface SseStreamInit {
  path: string
  method?: "GET" | "POST"
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  reconnect?: SseReconnectPolicy | boolean
  onOpen?: (response: Response) => void
  onMessage: (message: SseMessage) => void
  fetchImpl?: typeof fetch
}

export async function openSseStream(init: SseStreamInit): Promise<void> {
  const method = init.method ?? "GET"
  const policy = resolvePolicy(init.reconnect)

  if (policy !== null && method !== "GET") {
    throw new Error(
      "Reconnecting a POST SSE stream would resend the request body and duplicate the turn."
    )
  }

  let attempt = 0
  let lastEventId: string | undefined

  for (;;) {
    if (init.signal?.aborted) return
    try {
      lastEventId = await runStream(init, method, lastEventId)
      return
    } catch (error) {
      const normalized = normalizeError(error)
      if (normalized.kind === "canceled" || init.signal?.aborted === true)
        return
      const canRetry =
        policy !== null &&
        attempt < policy.maxAttempts &&
        isRetryableError(normalized)
      if (!canRetry) throw normalized

      await delay(backoffDelay(policy, attempt), init.signal)
      attempt += 1
    }
  }
}

async function runStream(
  init: SseStreamInit,
  method: "GET" | "POST",
  lastEventId: string | undefined
): Promise<string | undefined> {
  try {
    return await requestStream(init, method, lastEventId)
  } catch (error) {
    throw normalizeTransportError(error)
  }
}

async function requestStream(
  init: SseStreamInit,
  method: "GET" | "POST",
  lastEventId: string | undefined
): Promise<string | undefined> {
  const doFetch = init.fetchImpl ?? fetch
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    ...(await getAuthHeaders()),
    ...(lastEventId === undefined ? {} : { "Last-Event-ID": lastEventId }),
    ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
    ...init.headers,
  }

  const response = await doFetch(resolveApiUrl(init.path), {
    method,
    headers,
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    ...(init.signal === undefined ? {} : { signal: init.signal }),
    credentials: "same-origin",
    cache: "no-store",
  })

  if (!response.ok) {
    throw normalizeHttpError({
      status: response.status,
      data: await safeText(response),
      headers: response.headers,
    })
  }
  if (response.body === null) {
    throw normalizeHttpError({
      status: response.status,
      data: "Empty event stream.",
    })
  }

  init.onOpen?.(response)

  let seenId = lastEventId
  await readSseStream(
    response.body,
    (message) => {
      if (message.id !== undefined) seenId = message.id
      init.onMessage(message)
    },
    init.signal
  )
  return seenId
}

function resolvePolicy(
  reconnect: SseStreamInit["reconnect"]
): SseReconnectPolicy | null {
  if (reconnect === undefined || reconnect === false) return null
  if (reconnect === true) return DEFAULT_RECONNECT_POLICY
  return reconnect
}

function backoffDelay(policy: SseReconnectPolicy, attempt: number): number {
  return Math.min(policy.initialDelayMs * 2 ** attempt, policy.maxDelayMs)
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true }
    )
  })
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ""
  }
}
