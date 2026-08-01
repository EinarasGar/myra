import { Sparkle } from "lucide-react"

import { mockAttributes, MOCK_LANDING_PROPOSAL } from "@/lib/mock"
import { Figure } from "@/components/figure"

import {
  LandingSection,
  MetaLabel,
  SectionAside,
  SectionEyebrow,
  SectionHeading,
  SectionLede,
} from "../section"

const CAPABILITIES = [
  {
    title: "Ask in words",
    body: '"How much did I spend on trains in Q2?" Answered from the ledger, with the rows behind the answer one click away.',
  },
  {
    title: "Search by meaning",
    body: 'Find "that Portuguese restaurant in May" without remembering that it was billed as MB WAY *A ADEGA.',
  },
  {
    title: "Draft the hard ones",
    body: "A partial sale with a fee, in a foreign currency, across two accounts: every entry worked out, still yours to approve.",
  },
  {
    title: "Your data stays yours",
    body: "No training on your ledger, ever. Self-hosted, you bring your own key — your data goes to the provider you chose, under your terms.",
  },
]

const ACTION =
  "rounded-button px-[18px] py-2.5 text-[12.5px] leading-none font-semibold"

export function MyraSection() {
  const proposal = MOCK_LANDING_PROPOSAL

  return (
    <LandingSection id="myra" className="scroll-mt-[68px]">
      <SectionEyebrow>05 · Myra</SectionEyebrow>
      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-14">
        <div>
          <SectionHeading className="mt-0">
            Myra drafts. You decide.
          </SectionHeading>
          <SectionLede>
            The assistant inside Sverto can&rsquo;t write to your ledger. It
            proposes: a photographed receipt becomes a filled-in transaction,
            and selling part of a holding becomes all the entries that takes.
            Every proposal arrives as a card you accept or reject.
          </SectionLede>
          <SectionAside>
            Imported bank and broker transactions follow the same rule: they
            land dimmed and unreviewed until you confirm them. Nothing enters
            your ledger behind your back, and the whole assistant can be
            switched off in settings without losing a feature that touches your
            money.
          </SectionAside>
          <dl className="mt-6 border-t border-border lg:mt-8">
            {CAPABILITIES.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-1.5 border-b border-border py-4 lg:flex-row lg:gap-4"
              >
                <dt className="text-[12.5px] leading-[1.4] font-semibold lg:w-[150px] lg:flex-none">
                  {item.title}
                </dt>
                <dd className="text-[13px] leading-[1.6] text-pretty text-ink-2">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start">
            <div className="rounded-panel border border-dashed border-border-strong bg-surface-2 px-3.5 py-4">
              <pre className="text-center font-mono text-[10.5px] leading-[1.9] whitespace-pre-wrap text-ink-3">
                {proposal.receiptLines.join("\n")}
              </pre>
              <MetaLabel className="mt-3 text-center font-mono tracking-[0.1em]">
                Photo attached
              </MetaLabel>
            </div>
            <div className="sm:pt-5">
              <MetaLabel>Step 1</MetaLabel>
              <p className="mt-2.5 text-[13.5px] leading-[1.6] text-pretty text-ink-2">
                You photograph a receipt in the Android app. Myra reads the
                merchant, the total, the currency and the date.
              </p>
              <MetaLabel className="mt-5">Step 2</MetaLabel>
              <p className="mt-2.5 text-[13.5px] leading-[1.6] text-pretty text-ink-2">
                It drafts the transaction and stops. Nothing is saved until you
                press Approve.
              </p>
            </div>
          </div>

          <div
            {...mockAttributes("landing.demo-ledger")}
            className="overflow-hidden rounded-sheet border border-brand bg-surface"
          >
            <div className="flex items-center gap-2.5 border-b border-border bg-brand-dim px-4 py-3 md:px-[18px]">
              <Sparkle
                className="size-3.5 text-brand"
                strokeWidth={1.8}
                aria-hidden
              />
              <MetaLabel className="tracking-[0.14em] text-brand">
                Myra proposes · not yet in your ledger
              </MetaLabel>
            </div>
            <div className="p-4 md:p-[18px]">
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[14px] leading-[1.3] font-semibold tracking-[-0.01em] md:text-[15px]">
                    {proposal.merchant}
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-[1.4] text-pretty text-ink-3 md:text-[12px]">
                    {proposal.meta}
                  </p>
                </div>
                <div className="flex-none text-right">
                  <Figure
                    {...proposal.amount}
                    className="block text-[17px] font-semibold tracking-[-0.02em] md:text-[20px]"
                  />
                  <p className="mt-1.5 text-[12px] leading-none text-ink-3">
                    <Figure
                      {...proposal.converted}
                      intent="meta"
                      className="text-[12px]"
                    />{" "}
                    at{" "}
                    <Figure
                      value={proposal.rate}
                      kind="rate"
                      intent="meta"
                      className="text-[12px]"
                    />
                  </p>
                </div>
              </div>
              <ul className="mt-4 overflow-hidden rounded-md border border-border">
                {proposal.entries.map((entry) => (
                  <li
                    key={entry.label}
                    className="flex min-h-10 items-center gap-3 border-b border-border px-3.5 py-2 last:border-b-0"
                  >
                    <span className="min-w-0 flex-1 text-[12px] leading-[1.3] font-medium">
                      {entry.label}
                    </span>
                    {entry.amount ? (
                      <Figure
                        {...entry.amount}
                        sign="always"
                        className="text-[12px]"
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <span className={`${ACTION} bg-brand text-on-brand`}>
                  Approve
                </span>
                <span
                  className={`${ACTION} border border-border-strong text-ink`}
                >
                  Edit first
                </span>
                <span
                  className={`${ACTION} hidden border border-border-strong text-ink-2 md:inline-block`}
                >
                  Discard
                </span>
              </div>
              <p className="mt-3.5 text-[11.5px] leading-[1.55] text-pretty text-ink-3">
                Approving writes a group of two transactions, each with its own
                category, plus a note that Myra drafted them from a photo. You
                can see and undo all of it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </LandingSection>
  )
}
