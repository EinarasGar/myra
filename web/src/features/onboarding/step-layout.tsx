import type { FormEvent, ReactNode } from "react"

import { useHasKeyboardAffordances } from "@/components/layout/breakpoints"
import { Button } from "@/components/ui/button"

import { BACK } from "./copy"

export function StepFrame({
  eyebrow,
  title,
  intro,
  onSubmit,
  children,
}: {
  eyebrow: ReactNode
  title: ReactNode
  intro?: ReactNode
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  return (
    <form
      noValidate
      data-slot="onboarding-step"
      onSubmit={onSubmit}
      className="flex flex-col"
    >
      <span className="text-[10px] leading-none font-semibold tracking-[0.14em] text-ink-3 uppercase">
        {eyebrow}
      </span>
      <h1 className="mt-3 text-[24px] leading-[1.25] font-bold tracking-[-0.024em] text-pretty">
        {title}
      </h1>
      {intro ? (
        <p className="mt-[11px] text-[13px] leading-[1.65] text-pretty text-ink-3">
          {intro}
        </p>
      ) : null}
      {children}
    </form>
  )
}

export function StepNav({
  onBack,
  nextLabel,
  nextDisabled = false,
  note,
}: {
  onBack?: () => void
  nextLabel: ReactNode
  nextDisabled?: boolean
  note?: ReactNode
}) {
  const showKeyHint = useHasKeyboardAffordances()

  return (
    <div
      data-slot="step-nav"
      className="mt-[26px] flex flex-wrap items-center gap-3"
    >
      {onBack ? (
        <Button type="button" variant="ghost" size="lg" onClick={onBack}>
          {BACK}
        </Button>
      ) : null}
      <Button type="submit" size="lg" disabled={nextDisabled}>
        {nextLabel}
        {showKeyHint ? (
          <span
            aria-hidden
            className="font-mono text-[10px] leading-none font-medium opacity-70"
          >
            ⏎
          </span>
        ) : null}
      </Button>
      {note ? (
        <span className="ms-auto text-[11.5px] leading-none text-ink-3">
          {note}
        </span>
      ) : null}
    </div>
  )
}
