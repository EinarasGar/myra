import { FALLBACK_MESSAGES, isPresentableMessage } from "./messages"
import type { AiErrorDetails, ApiErrorResponse, NormalizedError } from "./types"
import { isAiErrorDetails, isApiErrorResponse } from "./types"

export interface HttpErrorInput {
  status: number
  data?: unknown
  headers?: unknown
  cause?: unknown
}

const UNROUTED_BODY = "nothing to see here"

export function isNormalizedError(value: unknown): value is NormalizedError {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.kind === "string" &&
    typeof candidate.message === "string" &&
    candidate.kind in FALLBACK_MESSAGES
  )
}

export function normalizeError(error: unknown): NormalizedError {
  try {
    return normalizeErrorUnsafe(error)
  } catch (cause) {
    return { kind: "unknown", message: FALLBACK_MESSAGES.unknown, cause }
  }
}

export function normalizeHttpError(input: HttpErrorInput): NormalizedError {
  try {
    return normalizeHttpErrorUnsafe(input)
  } catch (cause) {
    return {
      kind: "unknown",
      message: FALLBACK_MESSAGES.unknown,
      status: input.status,
      cause,
    }
  }
}

export function normalizeTransportError(error: unknown): NormalizedError {
  if (isNormalizedError(error)) return error
  if (isCanceled(error)) {
    return {
      kind: "canceled",
      message: FALLBACK_MESSAGES.canceled,
      cause: error,
    }
  }
  const candidate = error as { code?: string; message?: string }
  return networkError({
    ...(typeof candidate?.code === "string" ? { code: candidate.code } : {}),
    ...(typeof candidate?.message === "string"
      ? { message: candidate.message }
      : {}),
    cause: error,
  })
}

export function normalizeAiError(details: unknown): NormalizedError {
  if (!isAiErrorDetails(details)) {
    return {
      kind: "unknown",
      message: FALLBACK_MESSAGES.unknown,
      cause: details,
    }
  }
  return fromAiErrorDetails(details)
}

export function isRetryableError(error: NormalizedError): boolean {
  if (error.kind === "network") return error.reason !== "offline"
  if (error.kind === "serverError") return true
  return false
}

export function getErrorMessage(error: unknown): string {
  const normalized = isNormalizedError(error) ? error : normalizeError(error)
  return normalized.message
}

function normalizeErrorUnsafe(error: unknown): NormalizedError {
  if (isNormalizedError(error)) return error

  if (isCanceled(error)) {
    return {
      kind: "canceled",
      message: FALLBACK_MESSAGES.canceled,
      cause: error,
    }
  }

  if (isAxiosLikeError(error)) {
    if (error.response) {
      return normalizeHttpErrorUnsafe({
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        cause: error,
      })
    }
    return networkError({
      ...(error.code === undefined ? {} : { code: error.code }),
      ...(error.message === undefined ? {} : { message: error.message }),
      cause: error,
    })
  }

  if (error instanceof Error) {
    return {
      kind: "unknown",
      message: FALLBACK_MESSAGES.unknown,
      detail: error.message,
      cause: error,
    }
  }

  return { kind: "unknown", message: FALLBACK_MESSAGES.unknown, cause: error }
}

function normalizeHttpErrorUnsafe(input: HttpErrorInput): NormalizedError {
  const { status, headers, cause } = input
  const body = parseBody(input.data)

  if (body.envelope) return fromEnvelope(status, body.envelope, headers, cause)

  const text = body.text?.trim() ?? ""
  const detail = text.length > 0 ? text : undefined
  const base = { status, detail, cause }

  if (status === 400) {
    return {
      kind: "validation",
      message: FALLBACK_MESSAGES.validation,
      fieldErrors: [],
      ...base,
    }
  }
  if (status === 401) {
    return {
      kind: "unauthorized",
      message: FALLBACK_MESSAGES.unauthorized,
      ...base,
    }
  }
  if (status === 403) {
    return { kind: "forbidden", message: FALLBACK_MESSAGES.forbidden, ...base }
  }
  if (status === 404) {
    return {
      kind: "notFound",
      message: FALLBACK_MESSAGES.notFound,
      unrouted: text === UNROUTED_BODY,
      ...base,
    }
  }
  if (status === 409) {
    return { kind: "conflict", message: FALLBACK_MESSAGES.conflict, ...base }
  }
  if (status === 429) {
    const retryAfterSeconds = readRetryAfter(headers)
    return {
      kind: "rateLimited",
      message: FALLBACK_MESSAGES.rateLimited,
      source: "ip",
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
      ...base,
    }
  }
  if (status >= 500) {
    return {
      kind: "serverError",
      message: FALLBACK_MESSAGES.serverError,
      transient: status === 502 || status === 503 || status === 504,
      ...base,
    }
  }

  return { kind: "unknown", message: FALLBACK_MESSAGES.unknown, ...base }
}

function fromEnvelope(
  status: number,
  raw: ApiErrorResponse,
  headers: unknown,
  cause: unknown
): NormalizedError {
  const base = {
    status,
    errorType: raw.error_type,
    raw,
    cause,
  }
  const serverMessage = isPresentableMessage(raw.message)
    ? raw.message
    : undefined

  switch (raw.error_type) {
    case "ValidationError":
      return {
        kind: "validation",
        message:
          raw.errors.length > 0
            ? FALLBACK_MESSAGES.validation
            : (serverMessage ?? FALLBACK_MESSAGES.validation),
        fieldErrors: raw.errors,
        ...base,
      }
    case "NotFound":
      return {
        kind: "notFound",
        message: serverMessage ?? FALLBACK_MESSAGES.notFound,
        unrouted: false,
        ...base,
      }
    case "Unauthorized":
      return {
        kind: "unauthorized",
        message: FALLBACK_MESSAGES.unauthorized,
        ...base,
      }
    case "Forbidden":
      return {
        kind: "forbidden",
        message: FALLBACK_MESSAGES.forbidden,
        ...base,
      }
    case "Conflict":
      return {
        kind: "conflict",
        message: serverMessage ?? FALLBACK_MESSAGES.conflict,
        ...base,
      }
    case "RateLimited": {
      const ai = isAiErrorDetails(raw.details) ? raw.details : undefined
      const retryAfterSeconds = readRetryAfter(headers)
      return {
        kind: "rateLimited",
        message: ai?.message ?? FALLBACK_MESSAGES.rateLimited,
        source: "ai",
        ...(ai ? { ai } : {}),
        ...(ai?.reset_at ? { resetAt: ai.reset_at } : {}),
        ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
        ...base,
      }
    }
    case "ServiceUnavailable":
    case "BadGateway":
      return {
        kind: "serverError",
        message: FALLBACK_MESSAGES.serverError,
        transient: true,
        ...base,
      }
    case "InternalServerError":
      return {
        kind: "serverError",
        message: FALLBACK_MESSAGES.serverError,
        transient: false,
        ...(raw.stack_trace ? { stackTrace: raw.stack_trace } : {}),
        ...base,
      }
  }
}

function fromAiErrorDetails(details: AiErrorDetails): NormalizedError {
  switch (details.kind) {
    case "rate_limited":
    case "provider_rate_limited":
    case "concurrency_limited":
      return {
        kind: "rateLimited",
        message: details.message,
        source: "ai",
        ai: details,
        ...(details.reset_at ? { resetAt: details.reset_at } : {}),
      }
    case "provider_unavailable":
      return {
        kind: "serverError",
        message: details.message,
        transient: true,
        detail: details.kind,
      }
    case "input_too_large":
    case "invalid_attachment":
      return {
        kind: "validation",
        message: details.message,
        fieldErrors: [],
        detail: details.kind,
      }
    case "turn_limit":
    case "fatal":
    case "unknown":
      return {
        kind: "serverError",
        message: details.message,
        transient: false,
        detail: details.kind,
      }
  }
}

function networkError(input: {
  code?: string
  message?: string
  cause: unknown
}): NormalizedError {
  const timedOut =
    input.code === "ECONNABORTED" ||
    input.code === "ETIMEDOUT" ||
    /timeout/i.test(input.message ?? "")
  const offline = typeof navigator !== "undefined" && navigator.onLine === false

  const reason: "offline" | "timeout" | "unreachable" = offline
    ? "offline"
    : timedOut
      ? "timeout"
      : "unreachable"

  return {
    kind: "network",
    message: FALLBACK_MESSAGES.network,
    reason,
    detail: input.code ?? input.message,
    cause: input.cause,
  }
}

interface ParsedBody {
  envelope?: ApiErrorResponse
  text?: string
}

function parseBody(data: unknown): ParsedBody {
  if (data === null || data === undefined) return {}
  if (isApiErrorResponse(data)) return { envelope: data }
  if (typeof data === "string") {
    const trimmed = data.trim()
    if (trimmed.length === 0) return {}
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (isApiErrorResponse(parsed)) return { envelope: parsed }
    } catch {
      // not JSON — plain-text bodies are expected on several routes
    }
    return { text: trimmed }
  }
  if (typeof data === "object") return {}
  return { text: String(data) }
}

function readRetryAfter(headers: unknown): number | undefined {
  const value =
    readHeader(headers, "retry-after") ??
    readHeader(headers, "x-ratelimit-after")
  if (value === undefined) return undefined
  const seconds = Number.parseInt(value, 10)
  return Number.isFinite(seconds) ? seconds : undefined
}

function readHeader(headers: unknown, name: string): string | undefined {
  if (typeof headers !== "object" || headers === null) return undefined
  const getter = (headers as { get?: unknown }).get
  if (typeof getter === "function") {
    const value: unknown = (getter as (key: string) => unknown).call(
      headers,
      name
    )
    return typeof value === "string" ? value : undefined
  }
  for (const [key, value] of Object.entries(
    headers as Record<string, unknown>
  )) {
    if (key.toLowerCase() !== name) continue
    if (typeof value === "string") return value
    if (typeof value === "number") return String(value)
  }
  return undefined
}

interface AxiosLikeError {
  isAxiosError?: boolean
  code?: string
  message?: string
  response?: { status: number; data?: unknown; headers?: unknown }
}

function isAxiosLikeError(error: unknown): error is AxiosLikeError {
  if (typeof error !== "object" || error === null) return false
  return (error as AxiosLikeError).isAxiosError === true
}

function isCanceled(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const candidate = error as { name?: string; code?: string }
  return (
    candidate.name === "CanceledError" ||
    candidate.name === "AbortError" ||
    candidate.code === "ERR_CANCELED"
  )
}
