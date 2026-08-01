import { SourceButton, StartFreeButton } from "../cta"
import { LandingSection } from "../section"

const FACTS = ["No card, no bank connection needed to try it"]

export function CloseSection() {
  return (
    <LandingSection>
      <div className="grid justify-items-center border-t border-border pt-14 text-center lg:pt-20">
        <p className="max-w-[560px] text-[18px] leading-[1.45] text-pretty text-ink md:text-[20px] lg:text-[22px] lg:leading-[1.4]">
          Close the spreadsheet; it&rsquo;s been wrong since March anyway.
        </p>

        <div className="mt-7 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-3 lg:mt-8">
          <StartFreeButton className="w-full sm:w-auto" />
          <SourceButton className="w-full sm:w-auto" />
        </div>

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 text-[12px] leading-none text-ink-3 lg:mt-6">
          {FACTS.map((fact, index) => (
            <li key={fact} className="flex items-center gap-3.5">
              {index === 0 ? null : (
                <span aria-hidden className="text-border-strong">
                  ·
                </span>
              )}
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </LandingSection>
  )
}
