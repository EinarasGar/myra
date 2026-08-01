import { lazy, Suspense } from "react"

import { env } from "@/lib/env"
import { LoadingState, SkeletonRows } from "@/components/states/loading-state"

import { AuthScreenFrame } from "./auth-screen-frame"
import { CLERK_INTRO, CLERK_LOADING, SIGN_IN_EYEBROW } from "./copy"
import { DatabaseSignIn, DatabaseSignUp } from "./database-screens"
import { NoauthScreen } from "./noauth-screen"

const ClerkSignInScreen = lazy(async () => ({
  default: (await import("./clerk-screens")).ClerkSignInScreen,
}))

const ClerkSignUpScreen = lazy(async () => ({
  default: (await import("./clerk-screens")).ClerkSignUpScreen,
}))

function ClerkFallback() {
  return (
    <AuthScreenFrame eyebrow={SIGN_IN_EYEBROW} intro={CLERK_INTRO}>
      <LoadingState label={CLERK_LOADING}>
        <SkeletonRows count={3} height={40} />
      </LoadingState>
    </AuthScreenFrame>
  )
}

export function SignInScreen() {
  if (env.authProvider === "noauth") return <NoauthScreen />
  if (env.authProvider === "database") return <DatabaseSignIn />
  return (
    <Suspense fallback={<ClerkFallback />}>
      <ClerkSignInScreen />
    </Suspense>
  )
}

export function SignUpScreen() {
  if (env.authProvider === "noauth") return <NoauthScreen />
  if (env.authProvider === "database") return <DatabaseSignUp />
  return (
    <Suspense fallback={<ClerkFallback />}>
      <ClerkSignUpScreen />
    </Suspense>
  )
}
