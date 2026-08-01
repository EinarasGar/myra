import { cn } from "@/lib/utils"
import { Figure } from "@/components/figure"
import { Button } from "@/components/ui/button"

import { appUrl } from "../app-url"
import { LANDING_SOURCE_URL } from "../links"
import {
  LandingSection,
  SectionEyebrow,
  SectionHeading,
  SectionLede,
} from "../section"

const CHIP =
  "rounded-chip border px-[6px] py-[3px] font-mono text-[9px] leading-none font-semibold tracking-[0.1em] uppercase"

const HOSTED = [
  "Hosted in the EU, under EU law",
  "Market data and Myra included, nothing separate to sign up for",
  "New features reach you automatically",
  "Something not right? You get a reply from me, not a ticket queue",
]

const SELF_HOSTED = [
  "The same application, feature for feature, nothing withheld",
  "Bring your own market-data source",
  "Bring your own AI key, or run without Myra entirely",
  "Your Postgres, your backups, your uptime",
  "Web and Android, pointed at your server",
]

export function PricingSection() {
  return (
    <LandingSection id="pricing" className="scroll-mt-[68px]">
      <SectionEyebrow>08 · Pricing</SectionEyebrow>
      <SectionHeading>
        Free right now. Here&rsquo;s what happens later.
      </SectionHeading>
      <SectionLede className="max-w-[760px]">
        The hosted version costs nothing while we&rsquo;re learning from the
        people using it. At some point it&rsquo;ll need a small optional
        subscription, enough to cover the market data, AI, OpenBanking, servers
        costs, and to support further development. Self-hosting stays free and
        complete either way, and export ships before any bill does.
      </SectionLede>

      <div className="mt-6 grid gap-3 lg:mt-9 lg:grid-cols-2 lg:gap-5">
        <article className="flex flex-col rounded-2xl border border-brand bg-surface p-[22px] lg:px-8 lg:pt-[30px] lg:pb-8">
          <div className="flex flex-wrap items-baseline gap-3">
            <h3 className="text-[15px] leading-none font-bold tracking-[-0.01em] lg:text-[17px]">
              Sverto.com
            </h3>
            <span className={cn(CHIP, "border-brand text-brand")}>
              Free during launch
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-baseline gap-2.5 lg:mt-5">
            <Figure
              value={0}
              currency="EUR"
              decimals={0}
              className="text-[34px] font-semibold tracking-[-0.04em] lg:text-[44px]"
            />
            <span className="text-[13px] leading-none text-ink-2 lg:text-[14px]">
              while we&rsquo;re gathering feedback
            </span>
          </div>
          <p className="mt-3 text-[14px] leading-[1.5] font-medium text-pretty text-ink">
            Everything running, with nothing to set up.
          </p>
          <div className="my-6 h-px bg-border" />
          <ul className="flex flex-col gap-2.5 text-[13px] leading-[1.55] text-ink-2 lg:text-[13.5px]">
            {HOSTED.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-5 text-[12px] leading-[1.55] text-pretty text-ink-3">
            Free while we&rsquo;re gathering feedback. When a subscription
            arrives you&rsquo;ll hear it from me first, and you can export
            everything or self-host instead.
          </p>
          <div className="mt-auto pt-6 lg:pt-[26px]">
            <Button
              nativeButton={false}
              render={<a href={appUrl("/signup")} />}
              className="h-11 w-full rounded-button bg-brand text-[14px] font-semibold text-on-brand"
            >
              Get started free
            </Button>
          </div>
        </article>

        <article className="flex flex-col rounded-2xl border border-border-strong bg-surface p-[22px] lg:px-8 lg:pt-[30px] lg:pb-8">
          <div className="flex flex-wrap items-baseline gap-3">
            <h3 className="text-[15px] leading-none font-bold tracking-[-0.01em] lg:text-[17px]">
              Self-hosted
            </h3>
            <span className={cn(CHIP, "border-border-strong text-ink-3")}>
              AGPL-3.0
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-baseline gap-2.5 lg:mt-5">
            <Figure
              value={0}
              currency="EUR"
              decimals={0}
              className="text-[34px] font-semibold tracking-[-0.04em] lg:text-[44px]"
            />
            <span className="text-[13px] leading-none text-ink-2 lg:text-[14px]">
              / month, for as long as you like
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-[1.6] text-pretty text-ink-3">
            One <code className="font-mono text-[12px]">docker compose up</code>
            . Postgres and a container, nothing exotic.
          </p>
          <div className="my-6 h-px bg-border" />
          <ul className="flex flex-col gap-2.5 text-[13px] leading-[1.55] text-ink-2 lg:text-[13.5px]">
            {SELF_HOSTED.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="mt-auto pt-6 lg:pt-[26px]">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href={LANDING_SOURCE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                />
              }
              className="h-11 w-full rounded-button text-[14px] font-semibold"
            >
              Read the self-hosting guide
            </Button>
          </div>
        </article>
      </div>
    </LandingSection>
  )
}
