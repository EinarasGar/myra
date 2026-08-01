import { mockAttributes, MOCK_LANDING_JULY } from "@/lib/mock"
import { Figure } from "@/components/figure"

import {
  LandingSection,
  MetaLabel,
  SectionAside,
  SectionEyebrow,
  SectionHeading,
  SectionLede,
} from "../section"

export function CurrencySection() {
  const july = MOCK_LANDING_JULY

  return (
    <LandingSection id="multi-currency" className="scroll-mt-[68px]">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div>
          <SectionEyebrow>03 · Multi-currency</SectionEyebrow>
          <SectionHeading>A currency is just an asset.</SectionHeading>
          <SectionLede>
            Not a premium add-on, not a display setting. GBP, EUR, USD and your
            ETF units are the same kind of thing to the ledger, which is why
            converting between them is arithmetic rather than a migration.
          </SectionLede>
          <SectionAside>
            Everything converts into your reference currency at the rate that
            applied on the day it happened. March&rsquo;s salary is still what
            March&rsquo;s salary was worth; it doesn&rsquo;t get rewritten every
            time the pound moves.
          </SectionAside>
          <div
            {...mockAttributes("landing.demo-ledger")}
            className="mt-6 flex gap-6 lg:mt-8"
          >
            <div>
              <Figure
                value={july.currencyCount}
                kind="plain"
                className="text-[20px] font-semibold tracking-[-0.02em] lg:text-[22px]"
              />
              <p className="mt-1.5 text-[12px] leading-[1.4] text-ink-3">
                currencies, all equal
              </p>
            </div>
            <div aria-hidden className="w-px bg-border" />
            <div>
              <Figure
                {...july.surcharge}
                decimals={0}
                className="text-[20px] font-semibold tracking-[-0.02em] lg:text-[22px]"
              />
              <p className="mt-1.5 text-[12px] leading-[1.4] text-ink-3">
                extra for using more than one
              </p>
            </div>
          </div>
        </div>

        <div
          {...mockAttributes("landing.demo-ledger")}
          className="overflow-hidden rounded-sheet border border-border bg-surface"
        >
          <div className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-2.5 md:px-[18px] md:py-3">
            <MetaLabel>July · as recorded</MetaLabel>
            <span className="flex-1" />
            <MetaLabel>In EUR</MetaLabel>
          </div>
          {july.rows.map((row) => (
            <div
              key={row.label}
              className="flex min-h-14 items-center gap-3 border-b border-border px-4 py-2.5 md:gap-3.5 md:px-[18px]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-[1.3] font-medium text-pretty md:text-[13px]">
                  {row.label}
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 font-mono text-[10.5px] leading-[1.35] text-ink-3">
                  <Figure
                    {...row.recorded}
                    intent="secondary"
                    sign="always"
                    className="text-[12px] md:hidden"
                  />
                  <span>{row.meta}</span>
                </p>
              </div>
              <Figure
                {...row.recorded}
                intent="secondary"
                sign="always"
                className="hidden text-[13px] md:inline-flex"
              />
              <Figure
                value={row.converted?.value ?? null}
                currency={row.converted?.currency}
                locale={row.converted?.locale}
                intent={
                  row.converted && row.converted.value > 0
                    ? "inflow"
                    : "neutral"
                }
                className="w-[92px] flex-none text-right text-[13px] md:w-[104px]"
              />
            </div>
          ))}
          <div className="flex items-center gap-3.5 bg-surface-2 px-4 py-3.5 md:px-[18px] md:py-4">
            <p className="flex-1 text-[12.5px] leading-[1.3] font-bold md:text-[13px]">
              Net for July
            </p>
            <Figure
              {...july.net}
              intent="gainLoss"
              className="text-[16px] font-semibold tracking-[-0.02em] md:text-[18px]"
            />
          </div>
          <p className="border-t border-border px-4 py-3 text-[11px] leading-[1.5] text-pretty text-ink-3 md:px-[18px]">
            Three currencies, one figure. Each line keeps the rate and date it
            was converted at; changing your reference currency re-derives the
            column, not the history.
          </p>
        </div>
      </div>
    </LandingSection>
  )
}
