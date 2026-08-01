import type { ReactNode } from "react"

import { LANDING_SOURCE_URL } from "../links"
import { LandingSection, SectionEyebrow, SectionHeading } from "../section"

const PARAGRAPH =
  "text-[14px] leading-[1.7] text-pretty text-ink-2 lg:text-[15px] lg:leading-[1.75]"

export function FounderSection({ commitFeed }: { commitFeed: ReactNode }) {
  return (
    <LandingSection id="founder" className="scroll-mt-[68px]">
      <SectionEyebrow>Who builds this</SectionEyebrow>
      <SectionHeading>It started with a coin collection.</SectionHeading>

      <div className="mt-7 grid gap-8 lg:mt-9 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-14">
        <div>
          <div className="flex flex-col gap-[18px]">
            <p className={PARAGRAPH}>
              I was fourteen and had just learned HTML, so I built a page to
              track my euro coins — which country each one came from, which ones
              were still missing. My first multi-currency ledger, though I
              didn&rsquo;t know to call it that.
            </p>

            <p className={PARAGRAPH}>
              Since then I&rsquo;ve lived in a few countries and been paid in a
              few currencies, running the same patched-together setup as
              everyone else. In 2023 I stopped waiting for someone to build the
              obvious thing. Sverto is that project, grown up.
            </p>

            <p className={PARAGRAPH}>
              You should know what you&rsquo;re signing up with: Sverto is one
              person. That&rsquo;s a fair thing to hesitate over — finance apps
              do shut down, and they usually take the data with them. So it is
              built so that you are not betting on me. The application is open
              source in full, the same one running here, and you can export
              everything whenever you want. If I stop, your ledger
              doesn&rsquo;t.
            </p>

            <p className={PARAGRAPH}>
              One day I&rsquo;d like to do this full time. That is what the
              subscription, when it arrives, will pay for: the market data, the
              servers, and eventually the person maintaining it.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 lg:mt-9">
            <p className="text-[14px] leading-none font-semibold text-ink">
              — Einaras Garbašauskas
            </p>
            <a
              href={LANDING_SOURCE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-chip text-[12.5px] leading-none font-medium text-ink-3 underline-offset-4 outline-none hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              the commit history is public →
            </a>
          </div>
        </div>

        {commitFeed}
      </div>
    </LandingSection>
  )
}
