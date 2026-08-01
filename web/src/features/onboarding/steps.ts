import {
  CURRENCY_STEP_BODY,
  CURRENCY_STEP_TITLE,
  START_STEP_BODY,
  START_STEP_TITLE,
  WELCOME_STEP_BODY,
  WELCOME_STEP_TITLE,
} from "./copy"

export const ONBOARDING_STEPS = ["welcome", "currency", "start"] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export type StepState = "done" | "now" | "todo"

export interface TrackerStep {
  id: OnboardingStep
  ordinal: string
  title: string
  body: string
  state: StepState
}

const STEP_COPY: Record<OnboardingStep, { title: string; body: string }> = {
  welcome: { title: WELCOME_STEP_TITLE, body: WELCOME_STEP_BODY },
  currency: { title: CURRENCY_STEP_TITLE, body: CURRENCY_STEP_BODY },
  start: { title: START_STEP_TITLE, body: START_STEP_BODY },
}

export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step) + 1
}

export function buildTracker(
  current: OnboardingStep,
  chosenCurrency: string | null
): TrackerStep[] {
  const currentIndex = ONBOARDING_STEPS.indexOf(current)

  return ONBOARDING_STEPS.map((id, index) => {
    const state: StepState =
      index < currentIndex ? "done" : index === currentIndex ? "now" : "todo"
    const copy = STEP_COPY[id]
    const body =
      id === "currency" && state === "done" && chosenCurrency !== null
        ? chosenCurrency
        : copy.body

    return {
      id,
      ordinal: state === "done" ? "✓" : String(index + 1),
      title: copy.title,
      body,
      state,
    }
  })
}
