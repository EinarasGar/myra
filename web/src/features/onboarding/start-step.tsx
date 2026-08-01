import { Footnote } from "@/components/primitives/panel"

import {
  START_FOOTNOTE,
  START_INTRO,
  START_NAV_NOTE,
  START_PENDING,
  START_SKIP,
  START_TITLE,
  STEP_LABEL,
} from "./copy"
import { PathAction } from "./path-card"
import { START_PATHS, type StartPath } from "./start-paths"
import { StepFrame, StepNav } from "./step-layout"
import { ONBOARDING_STEPS, stepIndex } from "./steps"

export function StartStep({
  onChoose,
  onSkip,
  onBack,
  isSubmitting,
}: {
  onChoose: (path: StartPath["id"]) => void
  onSkip: () => void
  onBack: () => void
  isSubmitting: boolean
}) {
  return (
    <StepFrame
      eyebrow={STEP_LABEL(stepIndex("start"), ONBOARDING_STEPS.length)}
      title={START_TITLE}
      intro={START_INTRO}
      onSubmit={(event) => {
        event.preventDefault()
        if (!isSubmitting) onSkip()
      }}
    >
      <ul className="mt-6 flex flex-col gap-[11px]">
        {START_PATHS.map((path) => (
          <PathAction
            key={path.id}
            glyph={path.glyph}
            title={path.title}
            body={path.body}
            note={path.note}
            emphasis={path.emphasis}
            disabled={isSubmitting}
            onSelect={() => onChoose(path.id)}
          />
        ))}
      </ul>

      <Footnote>{START_FOOTNOTE}</Footnote>

      <StepNav
        onBack={onBack}
        nextLabel={isSubmitting ? START_PENDING : START_SKIP}
        nextDisabled={isSubmitting}
        note={START_NAV_NOTE}
      />
    </StepFrame>
  )
}
