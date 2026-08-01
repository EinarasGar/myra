import { useState, type FormEvent, type ReactNode } from "react"
import { useMutation } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { UsersApiFactory } from "@/api"
import { signInWithPassword } from "@/auth/impl/database-session"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"

import { AuthFailureState } from "./auth-errors"
import { AuthScreenFrame } from "./auth-screen-frame"
import {
  CONFIRM_PASSWORD_LABEL,
  PASSWORD_LABEL,
  PASSWORD_RULE,
  SIGN_IN_CTA,
  SIGN_IN_EYEBROW,
  SIGN_IN_PENDING_CTA,
  SIGN_IN_SWITCH_LINK,
  SIGN_IN_SWITCH_PROMPT,
  SIGN_IN_TITLE,
  SIGN_UP_CTA,
  SIGN_UP_EYEBROW,
  SIGN_UP_FOOT,
  SIGN_UP_INTRO,
  SIGN_UP_PENDING_CTA,
  SIGN_UP_SWITCH_LINK,
  SIGN_UP_SWITCH_PROMPT,
  SIGN_UP_TITLE,
  USERNAME_LABEL,
  USERNAME_NOTE,
} from "./copy"
import { CredentialField } from "./credential-field"
import {
  hasErrors,
  serverCredentialErrors,
  validateSignIn,
  validateSignUp,
  type CredentialErrors,
} from "./validation"

const NO_ERRORS: CredentialErrors = { fieldErrors: {}, formErrors: [] }

function FormErrors({ messages }: { messages: readonly string[] }) {
  if (messages.length === 0) return null
  return (
    <p
      role="alert"
      className="rounded-sm border border-negative bg-negative-dim px-[13px] py-[10px] text-[12px] leading-[1.5] text-pretty text-ink"
    >
      {messages.join(" ")}
    </p>
  )
}

function SwitchLine({
  prompt,
  linkLabel,
  to,
}: {
  prompt: string
  linkLabel: string
  to: "/login" | "/signup"
}) {
  return (
    <p className="text-center">
      {prompt}{" "}
      <Link to={to} className="font-semibold text-brand">
        {linkLabel}
      </Link>
    </p>
  )
}

function CredentialForm({
  children,
  onSubmit,
}: {
  children: ReactNode
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-[15px]"
      data-slot="credential-form"
    >
      {children}
    </form>
  )
}

export function DatabaseSignIn() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [localErrors, setLocalErrors] = useState<CredentialErrors>(NO_ERRORS)

  const signIn = useMutation({
    mutationFn: () => signInWithPassword({ username, password }),
    meta: { suppressGlobalError: true },
  })

  const serverErrors = signIn.error
    ? serverCredentialErrors(signIn.error)
    : NO_ERRORS
  const showServerState = signIn.error !== null && !hasErrors(serverErrors)
  const busy = signIn.isPending || signIn.isSuccess

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = validateSignIn({ username, password })
    setLocalErrors(next)
    if (hasErrors(next)) return
    signIn.mutate()
  }

  return (
    <AuthScreenFrame
      eyebrow={SIGN_IN_EYEBROW}
      title={SIGN_IN_TITLE}
      footer={
        <SwitchLine
          prompt={SIGN_UP_SWITCH_PROMPT}
          linkLabel={SIGN_UP_SWITCH_LINK}
          to="/signup"
        />
      }
    >
      <CredentialForm onSubmit={submit}>
        <FormErrors
          messages={[...localErrors.formErrors, ...serverErrors.formErrors]}
        />
        {showServerState ? (
          <AuthFailureState
            error={signIn.error}
            endpoint="sign-in"
            path="/api/auth"
            onRetry={() => signIn.reset()}
          />
        ) : null}
        <CredentialField
          label={USERNAME_LABEL}
          note={USERNAME_NOTE}
          value={username}
          onValueChange={setUsername}
          autoComplete="username"
          disabled={busy}
          errors={serverErrors.fieldErrors.username ?? []}
        />
        <CredentialField
          label={PASSWORD_LABEL}
          type="password"
          value={password}
          onValueChange={setPassword}
          autoComplete="current-password"
          disabled={busy}
          errors={serverErrors.fieldErrors.password ?? []}
        />
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? SIGN_IN_PENDING_CTA : SIGN_IN_CTA}
        </Button>
      </CredentialForm>
    </AuthScreenFrame>
  )
}

export function DatabaseSignUp() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [localErrors, setLocalErrors] = useState<CredentialErrors>(NO_ERRORS)

  const signUp = useMutation({
    mutationFn: async () => {
      await api(UsersApiFactory).postUser({ username, password })
      await signInWithPassword({ username, password })
    },
    meta: { suppressGlobalError: true },
  })

  const serverErrors = signUp.error
    ? serverCredentialErrors(signUp.error)
    : NO_ERRORS
  const showServerState = signUp.error !== null && !hasErrors(serverErrors)
  const busy = signUp.isPending || signUp.isSuccess

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = validateSignUp({ username, password, confirmPassword })
    setLocalErrors(next)
    if (hasErrors(next)) return
    signUp.mutate()
  }

  return (
    <AuthScreenFrame
      eyebrow={SIGN_UP_EYEBROW}
      title={SIGN_UP_TITLE}
      intro={SIGN_UP_INTRO}
      footer={
        <>
          <p className="text-pretty">{SIGN_UP_FOOT}</p>
          <div className="mt-[10px]">
            <SwitchLine
              prompt={SIGN_IN_SWITCH_PROMPT}
              linkLabel={SIGN_IN_SWITCH_LINK}
              to="/login"
            />
          </div>
        </>
      }
    >
      <CredentialForm onSubmit={submit}>
        <FormErrors
          messages={[...localErrors.formErrors, ...serverErrors.formErrors]}
        />
        {showServerState ? (
          <AuthFailureState
            error={signUp.error}
            endpoint="sign-up"
            path="/api/users"
            onRetry={() => signUp.reset()}
          />
        ) : null}
        <CredentialField
          label={USERNAME_LABEL}
          note={USERNAME_NOTE}
          value={username}
          onValueChange={setUsername}
          autoComplete="username"
          disabled={busy}
          errors={serverErrors.fieldErrors.username ?? []}
        />
        <CredentialField
          label={PASSWORD_LABEL}
          note={PASSWORD_RULE}
          type="password"
          value={password}
          onValueChange={setPassword}
          autoComplete="new-password"
          disabled={busy}
          errors={[
            ...(localErrors.fieldErrors.password ?? []),
            ...(serverErrors.fieldErrors.password ?? []),
          ]}
        />
        <CredentialField
          label={CONFIRM_PASSWORD_LABEL}
          type="password"
          value={confirmPassword}
          onValueChange={setConfirmPassword}
          autoComplete="new-password"
          disabled={busy}
          errors={localErrors.fieldErrors.confirmPassword ?? []}
        />
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? SIGN_UP_PENDING_CTA : SIGN_UP_CTA}
        </Button>
      </CredentialForm>
    </AuthScreenFrame>
  )
}
