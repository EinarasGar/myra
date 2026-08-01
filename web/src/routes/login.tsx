import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { env } from "@/lib/env"
import { AuthShell } from "@/components/layout/auth-shell"
import { isSafeRedirect } from "@/components/layout/onboarding"
import {
  RootErrorPanel,
  RootPending,
} from "@/components/layout/route-boundaries"
import {
  AUTH_PITCH_BODY,
  AUTH_PITCH_POINTS,
  AUTH_PITCH_TITLE,
  BRAND_FOOT,
  SignInScreen,
} from "@/features/auth-screens"

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

function LoginRoute() {
  return (
    <AuthShell
      pitchTitle={AUTH_PITCH_TITLE}
      pitchBody={AUTH_PITCH_BODY}
      pitchPoints={AUTH_PITCH_POINTS}
      brandFoot={BRAND_FOOT}
    >
      <SignInScreen />
    </AuthShell>
  )
}

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (env.authProvider === "noauth") return
    if (!context.auth.isAuthenticated) return
    if (isSafeRedirect(search.redirect)) {
      throw redirect({ href: search.redirect })
    }
    throw redirect({ to: "/" })
  },
  component: LoginRoute,
  errorComponent: RootErrorPanel,
  pendingComponent: RootPending,
})
