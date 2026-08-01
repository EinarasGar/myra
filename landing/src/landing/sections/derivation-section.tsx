import { mockAttributes, MOCK_LANDING_TRADE } from "@/lib/mock"
import { cn } from "@/lib/utils"
import { Figure } from "@/components/figure"

import {
  LandingSection,
  MetaLabel,
  SectionEyebrow,
  SectionHeading,
  SectionLede,
} from "../section"

const ENTRY_SWATCHES = ["bg-chart-1", "bg-chart-2", "bg-chart-3"]

export function DerivationSection() {
  const trade = MOCK_LANDING_TRADE

  return (
    <LandingSection id="how-it-works" className="scroll-mt-[68px]">
      <SectionEyebrow>02 · How it works</SectionEyebrow>
      <SectionHeading className="max-w-[900px]">
        One ledger. Every number derived from it, live.
      </SectionHeading>
      <SectionLede className="max-w-[760px]">
        Every financial event, whether that&rsquo;s a coffee or an ETF purchase
        with its dealing fee, is one transaction made of signed entries that sum
        to zero. Nothing else gets stored. Balances, cost basis, gains,
        dividends and net worth are computed from those entries every time you
        look.
      </SectionLede>

      <div
        {...mockAttributes("landing.demo-ledger")}
        className="mt-6 grid items-stretch gap-0 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)]"
      >
        <div className="overflow-hidden rounded-sheet border border-brand bg-surface">
          <div className="flex items-center gap-2.5 border-b border-border bg-brand-dim px-[18px] py-3.5">
            <MetaLabel className="tracking-[0.14em] text-brand">
              What you record
            </MetaLabel>
            <span className="flex-1" />
            <span className="font-mono text-[10.5px] leading-none font-medium text-ink-3">
              {trade.dateLabel}
            </span>
          </div>
          <div className="px-[18px] pt-5 pb-[18px]">
            <p className="text-[14px] leading-[1.3] font-semibold tracking-[-0.01em] lg:text-[15px]">
              {trade.title}
            </p>
            <p className="mt-1.5 text-[12px] leading-[1.5] text-ink-3">
              {trade.meta}
            </p>
            <MetaLabel className="mt-[18px]">Entries</MetaLabel>
            <ul className="mt-3 overflow-hidden rounded-md border border-border">
              {trade.entries.map((entry, index) => (
                <li
                  key={entry.label}
                  className="flex min-h-11 items-center gap-3 border-b border-border px-3.5 py-2 last:border-b-0"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 flex-none rounded-[2px]",
                      ENTRY_SWATCHES[index]
                    )}
                  />
                  <span className="min-w-0 flex-1 text-[12.5px] leading-[1.3] font-medium">
                    {entry.label}
                  </span>
                  {entry.amount ? (
                    <Figure
                      {...entry.amount}
                      sign="always"
                      className="text-[12.5px]"
                    />
                  ) : (
                    <Figure
                      kind="units"
                      value={entry.units?.value ?? null}
                      ticker={entry.units?.ticker ?? null}
                      sign="always"
                      className="text-[12.5px]"
                    />
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-[1.5] text-ink-3">
              Units out equals cash in plus the fee. The entries balance, or the
              transaction doesn&rsquo;t save.
            </p>
          </div>
        </div>

        <div
          aria-hidden
          className="relative my-4 flex items-center gap-3 lg:my-0 lg:block"
        >
          <span className="h-px flex-1 bg-brand/50 lg:hidden" />
          <span className="font-mono text-[9px] leading-none font-semibold tracking-[0.14em] text-brand uppercase lg:hidden">
            derives
          </span>
          <span className="h-px flex-1 bg-brand/50 lg:hidden" />
          <svg
            viewBox="0 0 96 340"
            preserveAspectRatio="none"
            className="hidden h-full w-full lg:block"
          >
            <path
              d="M0,170 C46,170 50,58 96,58"
              fill="none"
              className="stroke-brand/55"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0,170 L96,170"
              fill="none"
              className="stroke-brand/55"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0,170 C46,170 50,282 96,282"
              fill="none"
              className="stroke-brand/55"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 bg-background px-[7px] py-[5px] font-mono text-[9px] leading-none font-semibold tracking-[0.1em] text-brand uppercase lg:block">
            derives
          </span>
        </div>

        <div className="flex flex-col justify-between gap-2.5 lg:gap-3.5">
          {trade.derived.map((item) => (
            <div
              key={item.label}
              className="rounded-sheet border border-border bg-surface px-[18px] py-4"
            >
              <div className="flex items-baseline justify-between gap-3.5">
                <MetaLabel>{item.label}</MetaLabel>
                <Figure
                  {...item.amount}
                  className="text-[15px] font-semibold tracking-[-0.02em] lg:text-[18px]"
                />
              </div>
              <p className="mt-2 text-[12px] leading-[1.55] text-ink-2">
                {item.note}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5 rounded-sheet border border-border-strong bg-surface-2 px-5 py-[18px] lg:mt-7 lg:flex-row lg:items-center lg:gap-9 lg:px-[30px] lg:py-[26px]">
        <p className="max-w-[620px] text-[19px] leading-[1.3] font-semibold tracking-[-0.02em] text-pretty lg:text-[26px] lg:tracking-[-0.025em]">
          Fix the past, and the present fixes itself.
        </p>
        <p className="flex-1 text-[13px] leading-[1.6] text-pretty text-ink-2 lg:text-[14px] lg:leading-[1.65]">
          Correct a fee from two years ago and every chart that depended on it
          corrects with it, because nothing was ever cached. No spreadsheet to
          update afterwards.
        </p>
      </div>
    </LandingSection>
  )
}
