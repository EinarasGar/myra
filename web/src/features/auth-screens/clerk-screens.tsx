import { SignIn, SignUp, useAuth as useClerkAuth } from "@clerk/clerk-react"

import { LoadingState, SkeletonRows } from "@/components/states/loading-state"
import { ConfirmState } from "@/components/states/message-state"

import { AuthScreenFrame } from "./auth-screen-frame"
import {
  CLERK_INTRO,
  CLERK_LOADING,
  CLERK_SIGNED_IN_BODY,
  CLERK_SIGNED_IN_HEADLINE,
  SIGN_IN_EYEBROW,
  SIGN_UP_EYEBROW,
} from "./copy"

type ClerkAppearance = NonNullable<Parameters<typeof SignIn>[0]["appearance"]>

const APPEARANCE: ClerkAppearance = {
  variables: {
    colorPrimary: "var(--color-brand)",
    colorText: "var(--color-ink)",
    colorTextSecondary: "var(--color-ink-3)",
    colorBackground: "var(--color-surface)",
    colorInputBackground: "var(--color-background)",
    colorInputText: "var(--color-ink)",
    colorDanger: "var(--color-negative)",
    borderRadius: "var(--radius-md)",
    fontFamily: "inherit",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full max-w-full shadow-none border border-border rounded-panel",
    card: "bg-surface shadow-none",
    headerTitle: "text-[20px] font-bold tracking-[-0.02em] text-ink",
    headerSubtitle: "text-[12.5px] leading-[1.6] text-ink-3",
    formFieldLabel:
      "text-[9.5px] font-semibold tracking-[0.11em] text-ink-3 uppercase",
    formButtonPrimary:
      "bg-brand text-on-brand text-[13px] font-semibold normal-case shadow-none hover:bg-brand/90",
    footer: "bg-surface-2 border-t border-border",
    footerActionText: "text-[12px] text-ink-3",
    footerActionLink: "text-[12px] font-semibold text-brand",
  },
}

function ClerkPending({ eyebrow }: { eyebrow: string }) {
  return (
    <AuthScreenFrame eyebrow={eyebrow} intro={CLERK_INTRO}>
      <LoadingState label={CLERK_LOADING}>
        <SkeletonRows count={3} height={40} />
      </LoadingState>
    </AuthScreenFrame>
  )
}

function ClerkSignedIn({ eyebrow }: { eyebrow: string }) {
  return (
    <AuthScreenFrame eyebrow={eyebrow}>
      <ConfirmState
        headline={CLERK_SIGNED_IN_HEADLINE}
        body={CLERK_SIGNED_IN_BODY}
      />
    </AuthScreenFrame>
  )
}

export function ClerkSignInScreen() {
  const clerk = useClerkAuth()

  if (!clerk.isLoaded) return <ClerkPending eyebrow={SIGN_IN_EYEBROW} />
  if (clerk.isSignedIn) return <ClerkSignedIn eyebrow={SIGN_IN_EYEBROW} />

  return (
    <AuthScreenFrame eyebrow={SIGN_IN_EYEBROW} intro={CLERK_INTRO}>
      <SignIn
        routing="hash"
        signUpUrl="/signup"
        fallbackRedirectUrl="/"
        appearance={APPEARANCE}
      />
    </AuthScreenFrame>
  )
}

export function ClerkSignUpScreen() {
  const clerk = useClerkAuth()

  if (!clerk.isLoaded) return <ClerkPending eyebrow={SIGN_UP_EYEBROW} />
  if (clerk.isSignedIn) return <ClerkSignedIn eyebrow={SIGN_UP_EYEBROW} />

  return (
    <AuthScreenFrame eyebrow={SIGN_UP_EYEBROW} intro={CLERK_INTRO}>
      <SignUp
        routing="hash"
        signInUrl="/login"
        fallbackRedirectUrl="/"
        appearance={APPEARANCE}
      />
    </AuthScreenFrame>
  )
}
