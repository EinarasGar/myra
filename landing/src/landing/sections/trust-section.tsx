import {
  CardBody,
  CardTitle,
  LandingSection,
  MetaLabel,
  SectionEyebrow,
  SectionHeading,
  SectionSplit,
} from "../section"

const GUARANTEES = [
  {
    title: "Audit the arithmetic",
    body: "The FIFO code and the conversion code are on GitHub. If a number looks wrong you can read exactly how it was computed — and file the bug if we got it wrong.",
  },
  {
    title: "Leave with everything",
    body: "Full export of every transaction and entry, any time, in a format that opens without us. No retention tricks at the door.",
  },
  {
    title: "It survives us",
    body: "If the company disappears, the licence doesn't. Your ledger keeps running on a machine you control, with the code you already have.",
  },
  {
    title: "EU-hosted, EU jurisdiction",
    body: "The hosted service runs in the EU under EU law. No data brokers, no ad tech, no third party buying your spending.",
  },
  {
    title: "Myra is optional",
    body: "Myra never trains on your data, and you can switch it off entirely. The ledger, the lots and the charts don't need it.",
  },
  {
    title: "Connections stay regulated",
    body: "Bank access runs through Open Banking, and broker access through official APIs. Sverto reads; it never moves money.",
  },
]

export function TrustSection() {
  return (
    <LandingSection id="self-hosting" className="scroll-mt-[68px]">
      <SectionEyebrow>06 · Trust &amp; ownership</SectionEyebrow>
      <SectionSplit>
        <SectionHeading className="mt-0 max-w-[720px]">
          Or don&rsquo;t trust us at all. Run it yourself.
        </SectionHeading>
        <p className="max-w-[420px] text-[13.5px] leading-[1.6] text-pretty text-ink-2 lg:text-[15px] lg:leading-[1.65]">
          Sverto is AGPL-3.0. Not a source-available teaser with the good parts
          removed: the entire application, the same one we host, running on your
          hardware with your own AI key if you want one.
        </p>
      </SectionSplit>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-5">
        {GUARANTEES.map((item) => (
          <article
            key={item.title}
            className="rounded-sheet border border-border bg-surface px-5 py-5 lg:px-6 lg:py-[22px]"
          >
            <CardTitle className="lg:text-[15px] lg:tracking-[-0.01em]">
              {item.title}
            </CardTitle>
            <CardBody className="lg:mt-2.5">{item.body}</CardBody>
          </article>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-sheet border border-brand bg-brand-dim px-5 py-5 lg:mt-6 lg:flex-row lg:items-center lg:gap-[30px] lg:px-[30px] lg:py-[26px]">
        <MetaLabel className="tracking-[0.14em] text-brand lg:flex-none lg:whitespace-nowrap">
          Where the line is
        </MetaLabel>
        <p className="text-[15px] leading-[1.5] font-medium text-pretty lg:text-[18px]">
          The app is open source and complete. The hosted service is what will
          eventually carry a subscription — covering the market data and the
          servers, and funding the work that keeps it improving. It&rsquo;s free
          today while we&rsquo;re gathering feedback. There is nothing else to
          sell: no ads, no data brokers, no third party buying your spending.
        </p>
      </div>
    </LandingSection>
  )
}
