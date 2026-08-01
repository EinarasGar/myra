import { createFileRoute, redirect } from "@tanstack/react-router"

import { authMeQueryOptions } from "@/auth"
import { needsOnboarding } from "@/components/layout/onboarding"
import {
  RootErrorPanel,
  RootPending,
} from "@/components/layout/route-boundaries"
import { OnboardingWizard } from "@/features/onboarding"

export const Route = createFileRoute("/_auth/onboarding")({
  beforeLoad: ({ context }) => {
    const me = context.queryClient.getQueryData(authMeQueryOptions().queryKey)
    if (me && !needsOnboarding(me)) {
      throw redirect({ to: "/" })
    }
  },
  component: OnboardingWizard,
  errorComponent: RootErrorPanel,
  pendingComponent: RootPending,
})
