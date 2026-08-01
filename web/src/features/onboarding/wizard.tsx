import { Suspense, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { UsersApiFactory } from "@/api"
import { authMeQueryKey, useAuth, useUserId } from "@/auth"
import { api } from "@/lib/api"
import type { AssetRef } from "@/lib/domain/refs"
import { AuthShell } from "@/components/layout/auth-shell"
import { ErrorStateFor } from "@/components/layout/error-states"
import { CURRENT_ONBOARDING_VERSION } from "@/components/layout/onboarding"
import { LoadingState, SkeletonRows } from "@/components/states/loading-state"
import { BRAND_FOOT } from "@/features/auth-screens"

import { BaseCurrencyStep } from "./base-currency-step"
import { CURRENCY_SAVED_NOTE } from "./copy"
import type { StartPath } from "./start-paths"
import { StartStep } from "./start-step"
import { StepTracker } from "./step-tracker"
import { buildTracker, type OnboardingStep } from "./steps"
import { WelcomeStep } from "./welcome-step"

type Destination = () => Promise<void>

export function OnboardingWizard() {
  const userId = useUserId()
  const { baseCurrency } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [step, setStep] = useState<OnboardingStep>(
    baseCurrency === null ? "welcome" : "start"
  )

  const refreshIdentity = () =>
    queryClient.invalidateQueries({ queryKey: authMeQueryKey })

  const saveBaseCurrency = useMutation({
    mutationFn: async (asset: AssetRef) => {
      await api(UsersApiFactory).postBaseAsset(userId, {
        asset_id: asset.assetId,
      })
      await refreshIdentity()
    },
    onSuccess: () => setStep("start"),
    meta: { errorContext: "Your base currency could not be saved" },
  })

  const finish = useMutation({
    mutationFn: async (go: Destination) => {
      await api(UsersApiFactory).postOnboarding(userId, {
        version: CURRENT_ONBOARDING_VERSION,
      })
      await refreshIdentity()
      await go()
    },
    meta: { errorContext: "Setup could not be completed" },
  })

  const goTo: Record<StartPath["id"], Destination> = {
    transaction: () => navigate({ to: "/transactions" }),
    bank: () =>
      navigate({ to: "/settings", search: { section: "connections" } }),
    receipt: () =>
      navigate({ to: "/transactions", search: { mode: "review" } }),
  }

  const tracker = buildTracker(step, baseCurrency)

  return (
    <AuthShell aside={<StepTracker steps={tracker} />} brandFoot={BRAND_FOOT}>
      {saveBaseCurrency.isError ? (
        <div className="mb-[18px]">
          <ErrorStateFor
            error={saveBaseCurrency.error}
            onRetry={() => saveBaseCurrency.reset()}
          />
        </div>
      ) : null}
      {finish.isError ? (
        <div className="mb-[18px]">
          <ErrorStateFor error={finish.error} onRetry={() => finish.reset()} />
        </div>
      ) : null}

      {step === "welcome" ? (
        <WelcomeStep onContinue={() => setStep("currency")} />
      ) : null}

      {step === "currency" ? (
        <Suspense
          fallback={
            <LoadingState label="Loading currencies">
              <SkeletonRows count={5} height={40} />
            </LoadingState>
          }
        >
          <BaseCurrencyStep
            onConfirm={(asset) => saveBaseCurrency.mutate(asset)}
            isSubmitting={saveBaseCurrency.isPending}
            onBack={() => setStep("welcome")}
          />
        </Suspense>
      ) : null}

      {step === "start" ? (
        <>
          {baseCurrency ? (
            <p className="mb-[18px] text-[11.5px] leading-[1.5] text-pretty text-ink-3">
              {`${baseCurrency} · ${CURRENCY_SAVED_NOTE}`}
            </p>
          ) : null}
          <StartStep
            onChoose={(id) => finish.mutate(goTo[id])}
            onSkip={() => finish.mutate(() => navigate({ to: "/" }))}
            onBack={() => setStep("currency")}
            isSubmitting={finish.isPending}
          />
        </>
      ) : null}
    </AuthShell>
  )
}
