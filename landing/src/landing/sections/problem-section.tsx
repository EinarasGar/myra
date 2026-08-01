import {
  CardBody,
  CardTitle,
  LandingSection,
  SectionEyebrow,
  SectionHeading,
  SectionLede,
} from "../section"

const COLUMNS = [
  {
    kicker: "Budgeting apps",
    title: "Track the groceries, ignore the portfolio.",
    body: "An ETF purchase is filed as a transfer to nowhere. Your net worth stops at the brokerage door, and the largest number in your life is the one the app can't see.",
  },
  {
    kicker: "Portfolio trackers",
    title: "Compute your gains, know nothing about rent.",
    body: "They will tell you your XIRR to four decimals and cannot tell you whether you can afford next month. Dividends land as income in a system with no concept of income.",
  },
  {
    kicker: "Everything American",
    title: "One currency, one country, one bank.",
    body: "Earn in GBP, spend in EUR, hold USD dividends and the model breaks. Or multi-currency turns up as a paid tier bolted onto a single-currency core, converting at today's rate as if history hadn't happened.",
  },
]

export function ProblemSection() {
  return (
    <LandingSection id="problem" className="scroll-mt-[68px]">
      <SectionEyebrow>01 · The problem</SectionEyebrow>
      <SectionHeading className="max-w-[840px]">
        Your money lives in one place. Your tools pretend it doesn&rsquo;t.
      </SectionHeading>
      <SectionLede className="max-w-[720px]">
        Budgeting apps won&rsquo;t touch your portfolio. Portfolio trackers
        won&rsquo;t touch your rent. So you keep two apps open and a spreadsheet
        between them, and once a month you spend an hour making three numbers
        agree. That&rsquo;s a job, not a feature.
      </SectionLede>
      <div className="mt-6 grid gap-3 md:grid-cols-3 md:gap-4 lg:mt-11 lg:gap-5">
        {COLUMNS.map((column) => (
          <article
            key={column.kicker}
            className="rounded-sheet border border-border bg-surface px-[18px] py-5 lg:px-6 lg:pt-6 lg:pb-[26px]"
          >
            <p className="font-mono text-[11.5px] leading-none font-semibold text-negative lg:text-[12.5px]">
              {column.kicker}
            </p>
            <CardTitle className="mt-2.5 lg:mt-3.5 lg:text-[19px] lg:tracking-[-0.015em]">
              {column.title}
            </CardTitle>
            <CardBody className="lg:mt-3">{column.body}</CardBody>
          </article>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3 rounded-panel border border-border-strong px-5 py-4 lg:flex-row lg:items-center lg:gap-3.5">
        <p className="font-mono text-[11px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase lg:whitespace-nowrap">
          The real competitor
        </p>
        <div
          aria-hidden
          className="hidden h-4 w-px flex-none bg-border-strong lg:block"
        />
        <p className="text-[13px] leading-[1.5] text-pretty text-ink-2 lg:text-[14px]">
          Not another app. It&rsquo;s the two-app stack plus the spreadsheet you
          already maintain, and the hour a month you spend making them agree.
        </p>
      </div>
    </LandingSection>
  )
}
