import type { NormalizedErrorKind } from "./types"

export type SerdeMessageKind =
  | "missingField"
  | "invalidType"
  | "invalidValue"
  | "invalidLength"
  | "unknownField"
  | "duplicateField"
  | "untaggedEnum"
  | "malformedJson"
  | "contentType"
  | "queryString"
  | "pathParam"
  | "unparsed"
  | "opaque"

export interface InterpretedMessage {
  message: string
  presentable: boolean
  raw: string
  serdeKind?: SerdeMessageKind
}

const JSON_BODY_PREFIX =
  "Failed to deserialize the JSON body into the target type: "
const JSON_PARSE_PREFIX = "Failed to parse the request body as JSON: "
const QUERY_STRING_PREFIX = "Failed to deserialize query string: "
const CONTENT_TYPE_MESSAGE =
  "Expected request with `Content-Type: application/json`"
const PATH_PARAM_PREFIX = "Invalid URL: Cannot parse"
const LINE_COLUMN_SUFFIX = / at line \d+ column \d+\.?$/

const SERDE_PATTERNS: ReadonlyArray<[RegExp, SerdeMessageKind]> = [
  [/^missing field `.+`$/, "missingField"],
  [/^invalid type: /, "invalidType"],
  [/^invalid value: /, "invalidValue"],
  [/^invalid length /, "invalidLength"],
  [/^unknown field `/, "unknownField"],
  [/^duplicate field `/, "duplicateField"],
  [/^data did not match any variant of untagged enum /, "untaggedEnum"],
  [/^EOF while parsing/, "malformedJson"],
  [/^expected value at line/, "malformedJson"],
  [/^trailing characters/, "malformedJson"],
]

export const SERDE_FALLBACK_MESSAGES: Record<SerdeMessageKind, string> = {
  missingField: "This field is required.",
  invalidType: "Enter a valid value.",
  invalidValue: "Enter a valid value.",
  invalidLength: "Enter a valid value.",
  unknownField: "This value isn't supported.",
  duplicateField: "This value was provided twice.",
  untaggedEnum: "Some details are invalid. Check the highlighted fields.",
  malformedJson: "That couldn't be sent properly. Try again.",
  contentType: "That couldn't be sent properly. Try again.",
  queryString: "One of the filters is invalid.",
  pathParam: "That link points to something invalid.",
  unparsed: "Something in this form is invalid.",
  opaque: "Sverto could not accept this. Check the value and try again.",
}

const MAX_PRESENTABLE_LENGTH = 200

/**
 * A backend string is shown to the user only if it reads like copy someone wrote for a
 * person. Anything carrying the shape of a Rust, sqlx or serde string is treated as a leak,
 * because the alternative — an optimistic default — makes every new backend message
 * user-facing by omission.
 */
const TECHNICAL_SIGNALS: readonly RegExp[] = [
  /`/,
  /::/,
  /[{}<>[\]]/,
  /\b[a-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\b/,
  /\b(?:panicked|unwrap|sqlx|serde|postgres|pgvector|deserialize|serialize|traceback|stack trace)\b/i,
]

function looksTechnical(body: string): boolean {
  if (body.length > MAX_PRESENTABLE_LENGTH) return true
  if (!/^[A-Z0-9"'“]/.test(body)) return true
  return TECHNICAL_SIGNALS.some((signal) => signal.test(body))
}

export const FALLBACK_MESSAGES: Record<NormalizedErrorKind, string> = {
  validation: "Some details are invalid. Check the highlighted fields.",
  notFound: "We couldn't find what you were looking for.",
  unauthorized: "Your session has expired. Sign in again to continue.",
  forbidden: "You don't have access to this.",
  conflict: "That change clashes with a newer one. Reload and try again.",
  rateLimited: "You're doing that too quickly. Please wait a moment.",
  serverError: "Something went wrong on our side. Please try again.",
  network: "We couldn't reach Sverto. Check your connection.",
  canceled: "That was cancelled before it finished.",
  unknown: "Something went wrong. Please try again.",
}

export function interpretFieldMessage(rawMessage: string): InterpretedMessage {
  const raw = rawMessage
  let body = rawMessage.trim()

  if (body === CONTENT_TYPE_MESSAGE) {
    return noise(raw, "contentType")
  }
  if (body.startsWith(PATH_PARAM_PREFIX)) {
    return noise(raw, "pathParam")
  }
  if (body.startsWith(JSON_PARSE_PREFIX)) {
    return noise(raw, "malformedJson")
  }
  if (body.startsWith(QUERY_STRING_PREFIX)) {
    return noise(raw, "queryString")
  }
  if (body.startsWith(JSON_BODY_PREFIX)) {
    body = body.slice(JSON_BODY_PREFIX.length)
  }

  body = body.replace(LINE_COLUMN_SUFFIX, "").trim()

  for (const [pattern, serdeKind] of SERDE_PATTERNS) {
    if (pattern.test(body)) return noise(raw, serdeKind)
  }

  if (body.length === 0) return noise(raw, "unparsed")
  if (looksTechnical(body)) return noise(raw, "opaque")

  return { message: body, presentable: true, raw }
}

export function isPresentableMessage(message: string): boolean {
  return interpretFieldMessage(message).presentable
}

function noise(raw: string, serdeKind: SerdeMessageKind): InterpretedMessage {
  return {
    message: SERDE_FALLBACK_MESSAGES[serdeKind],
    presentable: false,
    raw,
    serdeKind,
  }
}
