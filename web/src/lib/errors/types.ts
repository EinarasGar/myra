const ERROR_TYPES = [
  "NotFound",
  "ValidationError",
  "Unauthorized",
  "Forbidden",
  "Conflict",
  "InternalServerError",
  "ServiceUnavailable",
  "RateLimited",
  "BadGateway",
] as const

type ErrorType = (typeof ERROR_TYPES)[number]

export interface FieldError {
  field: string
  message: string
}

export interface ApiErrorResponse {
  error_type: ErrorType
  message: string
  errors: FieldError[]
  stack_trace?: string | null
  details?: unknown
}

const AI_ERROR_KINDS = [
  "rate_limited",
  "provider_rate_limited",
  "concurrency_limited",
  "provider_unavailable",
  "input_too_large",
  "invalid_attachment",
  "turn_limit",
  "fatal",
  "unknown",
] as const

type AiErrorKind = (typeof AI_ERROR_KINDS)[number]

export interface AiErrorDetails {
  kind: AiErrorKind
  message: string
  reset_at?: string | null
  scope?: string | null
  max_turns?: number | null
}

interface NormalizedErrorBase {
  message: string
  status?: number
  errorType?: ErrorType
  detail?: string
  raw?: ApiErrorResponse
  cause?: unknown
}

export interface NormalizedValidationError extends NormalizedErrorBase {
  kind: "validation"
  fieldErrors: FieldError[]
}

export interface NormalizedNotFoundError extends NormalizedErrorBase {
  kind: "notFound"
  unrouted: boolean
}

export interface NormalizedUnauthorizedError extends NormalizedErrorBase {
  kind: "unauthorized"
}

export interface NormalizedForbiddenError extends NormalizedErrorBase {
  kind: "forbidden"
}

export interface NormalizedConflictError extends NormalizedErrorBase {
  kind: "conflict"
}

export interface NormalizedRateLimitedError extends NormalizedErrorBase {
  kind: "rateLimited"
  source: "ai" | "ip"
  retryAfterSeconds?: number
  resetAt?: string
  ai?: AiErrorDetails
}

export interface NormalizedServerError extends NormalizedErrorBase {
  kind: "serverError"
  transient: boolean
  stackTrace?: string
}

export interface NormalizedNetworkError extends NormalizedErrorBase {
  kind: "network"
  reason: "offline" | "timeout" | "unreachable"
}

export interface NormalizedCanceledError extends NormalizedErrorBase {
  kind: "canceled"
}

export interface NormalizedUnknownError extends NormalizedErrorBase {
  kind: "unknown"
}

export type NormalizedError =
  | NormalizedValidationError
  | NormalizedNotFoundError
  | NormalizedUnauthorizedError
  | NormalizedForbiddenError
  | NormalizedConflictError
  | NormalizedRateLimitedError
  | NormalizedServerError
  | NormalizedNetworkError
  | NormalizedCanceledError
  | NormalizedUnknownError

export type NormalizedErrorKind = NormalizedError["kind"]

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.error_type === "string" &&
    (ERROR_TYPES as readonly string[]).includes(candidate.error_type) &&
    typeof candidate.message === "string" &&
    Array.isArray(candidate.errors)
  )
}

export function isAiErrorDetails(value: unknown): value is AiErrorDetails {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.kind === "string" &&
    (AI_ERROR_KINDS as readonly string[]).includes(candidate.kind) &&
    typeof candidate.message === "string"
  )
}
