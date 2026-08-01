import {
  STEP_LABEL,
  WELCOME_INTRO,
  WELCOME_NAV_NOTE,
  WELCOME_NEXT,
  WELCOME_POINTS,
  WELCOME_TITLE,
} from "./copy"
import { PathNote } from "./path-card"
import { StepFrame, StepNav } from "./step-layout"
import { ONBOARDING_STEPS, stepIndex } from "./steps"

export function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <StepFrame
      eyebrow={STEP_LABEL(stepIndex("welcome"), ONBOARDING_STEPS.length)}
      title={WELCOME_TITLE}
      intro={WELCOME_INTRO}
      onSubmit={(event) => {
        event.preventDefault()
        onContinue()
      }}
    >
      <ul className="mt-6 flex flex-col gap-[11px]">
        {WELCOME_POINTS.map((point) => (
          <PathNote
            key={point.title}
            glyph={point.glyph}
            title={point.title}
            body={point.body}
          />
        ))}
      </ul>
      <StepNav nextLabel={WELCOME_NEXT} note={WELCOME_NAV_NOTE} />
    </StepFrame>
  )
}
