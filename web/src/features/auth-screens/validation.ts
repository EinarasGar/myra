import { normalizeError, toFormErrors } from "@/lib/errors"

import {
  CREDENTIALS_REQUIRED,
  PASSWORD_MISMATCH,
  PASSWORD_TOO_SHORT,
} from "./copy"

export const MIN_PASSWORD_LENGTH = 8

export interface CredentialDraft {
  username: string
  password: string
  confirmPassword?: string
}

export type CredentialFieldName = "username" | "password" | "confirmPassword"

export interface CredentialErrors {
  fieldErrors: Partial<Record<CredentialFieldName, string[]>>
  formErrors: string[]
}

const EMPTY: CredentialErrors = { fieldErrors: {}, formErrors: [] }

export function validateSignIn(draft: CredentialDraft): CredentialErrors {
  if (draft.username.trim() === "" || draft.password === "") {
    return { fieldErrors: {}, formErrors: [CREDENTIALS_REQUIRED] }
  }
  return EMPTY
}

export function validateSignUp(draft: CredentialDraft): CredentialErrors {
  const fieldErrors: CredentialErrors["fieldErrors"] = {}
  if (draft.username.trim() === "" || draft.password === "") {
    return { fieldErrors, formErrors: [CREDENTIALS_REQUIRED] }
  }
  if (draft.password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = [PASSWORD_TOO_SHORT]
  }
  if (draft.confirmPassword !== draft.password) {
    fieldErrors.confirmPassword = [PASSWORD_MISMATCH]
  }
  return { fieldErrors, formErrors: [] }
}

export function hasErrors(errors: CredentialErrors): boolean {
  return (
    errors.formErrors.length > 0 || Object.keys(errors.fieldErrors).length > 0
  )
}

const SERVER_FIELD_NAMES: Record<string, CredentialFieldName> = {
  username: "username",
  password: "password",
}

export function serverCredentialErrors(error: unknown): CredentialErrors {
  if (normalizeError(error).kind !== "validation") return EMPTY

  const { fieldErrors, formErrors } = toFormErrors(error)
  const mapped: CredentialErrors["fieldErrors"] = {}
  const unattached: string[] = [...formErrors]

  for (const [path, messages] of Object.entries(fieldErrors)) {
    const name = SERVER_FIELD_NAMES[path.split(".")[0] ?? ""]
    if (name === undefined) {
      unattached.push(...messages)
      continue
    }
    mapped[name] = [...(mapped[name] ?? []), ...messages]
  }

  return { fieldErrors: mapped, formErrors: unattached }
}
