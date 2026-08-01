import { SourceButton, StartFreeButton } from "../cta"
import { LandingSection, MetaLabel, SectionEyebrow } from "../section"
import { ProductShot } from "./product-shot"

const REPLACES = [
  { name: "Budgeting app", note: "knows rent, refuses ETFs" },
  { name: "Portfolio tracker", note: "knows holdings, refuses groceries" },
  { name: "networth-2026.xlsx", note: "knows both, badly" },
]

export function HeroSection() {
  return (
    <LandingSection className="pt-10 md:pt-14 lg:pt-[72px] xl:pt-[88px]">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 xl:grid-cols-[640px_minmax(0,1fr)] xl:gap-14">
        <div>
          <SectionEyebrow>Personal finance · one ledger</SectionEyebrow>
          <h1 className="mt-4 text-[34px] leading-[1.1] font-bold tracking-[-0.035em] text-pretty md:text-[44px] lg:mt-5 lg:text-[52px] xl:text-[62px] xl:leading-[1.04] xl:tracking-[-0.038em]">
            One ledger for your groceries and your portfolio.
          </h1>
          <p className="mt-4 max-w-[600px] text-[15px] leading-[1.6] text-pretty text-ink-2 lg:mt-6 lg:text-[17px] xl:text-[18px]">
            Salary in GBP, spending in EUR, dividends in USD. Sverto records a
            coffee and an ETF purchase the same way, as entries in one register,
            so your net worth finally includes everything.
          </p>
          <p className="mt-3 max-w-[600px] text-[13.5px] leading-[1.6] text-pretty text-ink-3 lg:mt-4 lg:text-[15px] lg:leading-[1.65]">
            The alternative is what you do now: a budgeting app that refuses
            investments and a portfolio tracker that refuses rent, with a
            spreadsheet in the middle that you reconcile by hand at the end of
            every month.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3 lg:mt-8">
            <StartFreeButton className="w-full sm:w-auto" />
            <SourceButton className="w-full sm:w-auto" />
          </div>
          <ul className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] leading-none text-ink-3">
            <li>Free while we&rsquo;re gathering feedback</li>
            <li aria-hidden className="text-border-strong">
              ·
            </li>
            <li>AGPL-3.0, self-host it instead</li>
            <li aria-hidden className="text-border-strong">
              ·
            </li>
            <li>Web + Android</li>
          </ul>
        </div>

        <div className="lg:pt-[18px]">
          <div className="rounded-sheet border border-border-strong bg-surface px-5 py-[18px]">
            <MetaLabel className="tracking-[0.14em]">
              What it replaces
            </MetaLabel>
            <ul className="mt-4 flex flex-col gap-3">
              {REPLACES.map((item) => (
                <li
                  key={item.name}
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1"
                >
                  <span className="font-mono text-[12.5px] leading-[1.4] font-medium text-ghost line-through">
                    {item.name}
                  </span>
                  <span className="text-[12px] leading-[1.4] text-ink-3">
                    {item.note}
                  </span>
                </li>
              ))}
            </ul>
            <div className="my-4 h-px bg-border" />
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="font-mono text-[12.5px] leading-[1.4] font-semibold text-brand">
                Sverto
              </span>
              <span className="text-[12px] leading-[1.4] text-ink-2">
                one ledger, one reference currency
              </span>
            </div>
          </div>
          <p className="mt-3.5 text-[11.5px] leading-[1.6] text-pretty text-ink-3">
            Import your statements and let AI read them, connect your bank
            accounts through Open Banking, or link your investment accounts with
            connectors. Manual entry is a first-class path, not a fallback.
          </p>
        </div>
      </div>

      <ProductShot />
    </LandingSection>
  )
}
