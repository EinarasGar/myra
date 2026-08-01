import { createFileRoute, redirect } from "@tanstack/react-router"

import { env } from "@/lib/env"
import { AuthShell } from "@/components/layout/auth-shell"
import {
  RootErrorPanel,
  RootPending,
} from "@/components/layout/route-boundaries"
import {
  AUTH_PITCH_BODY,
  AUTH_PITCH_POINTS,
  AUTH_PITCH_TITLE,
  BRAND_FOOT,
  SignUpScreen,
} from "@/features/auth-screens"

function SignupRoute() {
  return (
    <AuthShell
      pitchTitle={AUTH_PITCH_TITLE}
      pitchBody={AUTH_PITCH_BODY}
      pitchPoints={AUTH_PITCH_POINTS}
      brandFoot={BRAND_FOOT}
    >
      <SignUpScreen />
    </AuthShell>
  )
}

export const Route = createFileRoute("/signup")({
  beforeLoad: ({ context }) => {
    if (env.authProvider === "noauth") return
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/" })
    }
  },
  component: SignupRoute,
  errorComponent: RootErrorPanel,
  pendingComponent: RootPending,
})
