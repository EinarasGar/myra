import type { InterpretedMessage } from "./messages"
import { interpretFieldMessage } from "./messages"
import { normalizeError } from "./normalize"

const DEFAULT_FORM_LEVEL_FIELDS: readonly string[] = [
  "body",
  "query",
  "transaction",
]

export interface FormErrors {
  fieldErrors: Record<string, string[]>
  formErrors: string[]
  hasUnmappableErrors: boolean
}

export interface ToFormErrorsOptions {
  formLevelFields?: Iterable<string>
  fieldMessages?: Record<string, string>
}

export function toFieldErrors(error: unknown): Record<string, string[]> {
  const normalized = normalizeError(error)
  if (normalized.kind !== "validation") return {}

  const grouped: Record<string, string[]> = {}
  for (const fieldError of normalized.fieldErrors) {
    const interpreted = interpretFieldMessage(fieldError.message)
    push(grouped, fieldError.field, interpreted.message)
  }
  return grouped
}

export function toFormErrors(
  error: unknown,
  options: ToFormErrorsOptions = {}
): FormErrors {
  const normalized = normalizeError(error)
  const formLevelFields = new Set(
    options.formLevelFields ?? DEFAULT_FORM_LEVEL_FIELDS
  )

  if (normalized.kind !== "validation") {
    return {
      fieldErrors: {},
      formErrors: [normalized.message],
      hasUnmappableErrors: false,
    }
  }

  if (normalized.fieldErrors.length === 0) {
    return {
      fieldErrors: {},
      formErrors: [normalized.message],
      hasUnmappableErrors: true,
    }
  }

  const fieldErrors: Record<string, string[]> = {}
  const formErrors: string[] = []
  let hasUnmappableErrors = false

  for (const fieldError of normalized.fieldErrors) {
    const interpreted = interpretFieldMessage(fieldError.message)
    const message = resolveMessage(fieldError.field, interpreted, options)

    if (formLevelFields.has(fieldError.field)) {
      hasUnmappableErrors = true
      if (!formErrors.includes(message)) formErrors.push(message)
      continue
    }
    push(fieldErrors, fieldError.field, message)
  }

  return { fieldErrors, formErrors, hasUnmappableErrors }
}

export function hasFieldError(error: unknown, field: string): boolean {
  return toFieldErrors(error)[field] !== undefined
}

function resolveMessage(
  field: string,
  interpreted: InterpretedMessage,
  options: ToFormErrorsOptions
): string {
  if (interpreted.presentable) return interpreted.message
  return options.fieldMessages?.[field] ?? interpreted.message
}

function push(target: Record<string, string[]>, key: string, value: string) {
  const existing = target[key]
  if (existing === undefined) {
    target[key] = [value]
    return
  }
  if (!existing.includes(value)) existing.push(value)
}
