import { mockAttributes, MOCK_LANDING_POSITION } from "@/lib/mock"
import { cn } from "@/lib/utils"
import { Figure } from "@/components/figure"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  CardBody,
  CardTitle,
  LandingSection,
  MetaLabel,
  SectionEyebrow,
  SectionHeading,
  SectionSplit,
} from "../section"

const OPENED_COL = "hidden xl:table-cell"
const UNIT_COST_COL = "hidden lg:table-cell"
const BASIS_COL = "hidden lg:table-cell"
const VALUE_COL = "hidden md:table-cell"
const CELL = "px-3 py-3 text-[12.5px] lg:px-4"
const NUM = `${CELL} text-right`

const PROMISES = [
  {
    title: "FIFO by default",
    body: "Sell 5 units and Sverto takes them from the oldest lot — FIFO, the default most EU tax regimes assume.",
  },
  {
    title: "Dividends are income",
    body: "They land next to your salary in the same cash-flow view, converted like everything else.",
  },
  {
    title: "Fees are visible",
    body: "In the basis, in the total, and countable as their own category when you want the bad news.",
  },
  {
    title: "Connect or type it",
    body: "Brokers sync through official APIs; bank and card activity through Open Banking; manual entry is a first-class path, not a fallback.",
  },
]

export function InvestingSection() {
  const position = MOCK_LANDING_POSITION

  return (
    <LandingSection id="investing" className="scroll-mt-[68px]">
      <SectionEyebrow>04 · Investing</SectionEyebrow>
      <SectionSplit>
        <SectionHeading className="mt-0 max-w-[760px]">
          Numbers that match your broker statement.
        </SectionHeading>
        <p className="max-w-[400px] text-[13.5px] leading-[1.6] text-pretty text-ink-2 lg:text-[15px] lg:leading-[1.65]">
          Purchase lots in FIFO order, realised and unrealised split apart,
          dividends as income, fees in the basis. Derived from the same entries
          as your spending, not imported from a second system that disagrees
          with the first.
        </p>
      </SectionSplit>

      <div
        {...mockAttributes("landing.demo-ledger")}
        className="mt-6 overflow-hidden rounded-sheet border border-border bg-surface lg:mt-10"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-4 lg:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-none font-bold tracking-[-0.01em]">
              {position.ticker}
            </p>
            <p className="mt-1.5 text-[11.5px] leading-[1.4] text-pretty text-ink-3">
              {position.name}
            </p>
          </div>
          <div className="text-right">
            <MetaLabel>Value</MetaLabel>
            <Figure
              {...position.marketValue}
              className="mt-2 block text-[18px] font-semibold tracking-[-0.02em] lg:text-[20px]"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-surface-2">
              <TableHead className={cn("px-3 lg:px-4", OPENED_COL)}>
                Opened
              </TableHead>
              <TableHead className="px-3 lg:px-4">Lot</TableHead>
              <TableHead className="px-3 text-right lg:px-4">Units</TableHead>
              <TableHead
                className={cn("px-3 text-right lg:px-4", UNIT_COST_COL)}
              >
                Unit cost
              </TableHead>
              <TableHead className={cn("px-3 text-right lg:px-4", BASIS_COL)}>
                Cost basis
              </TableHead>
              <TableHead className={cn("px-3 text-right lg:px-4", VALUE_COL)}>
                Market value
              </TableHead>
              <TableHead className="px-3 text-right lg:px-4">
                Unrealised
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {position.lots.map((lot) => {
              const closed = lot.state === "closed"
              return (
                <TableRow
                  key={lot.label}
                  className={cn(closed && "bg-ghost-dim text-ghost")}
                >
                  <TableCell className={cn(CELL, "text-ink-2", OPENED_COL)}>
                    {lot.opened}
                  </TableCell>
                  <TableCell className={cn(CELL, "whitespace-normal")}>
                    <span className="flex flex-wrap items-center gap-2">
                      {lot.label}
                      {lot.state === "new" ? (
                        <span className="rounded-chip border border-brand px-[5px] py-[3px] font-mono text-[9px] leading-none font-semibold tracking-[0.06em] text-brand uppercase">
                          New
                        </span>
                      ) : null}
                      {closed ? (
                        <span className="rounded-chip border border-border-strong px-[5px] py-[3px] font-mono text-[9px] leading-none font-semibold tracking-[0.06em] uppercase">
                          Closed
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[11px] text-ink-3 xl:hidden">
                      {lot.opened}
                    </span>
                  </TableCell>
                  <TableCell className={NUM}>
                    <Figure
                      kind="units"
                      value={lot.units.value}
                      ticker={lot.units.ticker}
                      intent={closed ? "ghost" : "neutral"}
                      className="text-[12.5px]"
                    />
                  </TableCell>
                  <TableCell className={cn(NUM, UNIT_COST_COL)}>
                    <Figure
                      value={lot.unitCost?.value ?? null}
                      currency={lot.unitCost?.currency}
                      locale={lot.unitCost?.locale}
                      intent={closed ? "ghost" : "neutral"}
                      className="text-[12.5px]"
                    />
                  </TableCell>
                  <TableCell className={cn(NUM, BASIS_COL)}>
                    <Figure
                      {...lot.costBasis}
                      intent={closed ? "ghost" : "neutral"}
                      className="text-[12.5px]"
                    />
                  </TableCell>
                  <TableCell className={cn(NUM, VALUE_COL)}>
                    <Figure
                      value={lot.marketValue?.value ?? null}
                      currency={lot.marketValue?.currency}
                      locale={lot.marketValue?.locale}
                      intent={closed ? "ghost" : "neutral"}
                      className="text-[12.5px]"
                    />
                  </TableCell>
                  <TableCell className={NUM}>
                    {lot.realised ? (
                      <span className="inline-flex items-baseline gap-1.5">
                        <span className="text-[11px] text-ink-3">realised</span>
                        <Figure
                          {...lot.realised}
                          intent="gainLoss"
                          className="text-[12.5px]"
                        />
                      </span>
                    ) : (
                      <span className="inline-flex items-baseline gap-1.5">
                        <Figure
                          value={lot.unrealised?.value ?? null}
                          currency={lot.unrealised?.currency}
                          locale={lot.unrealised?.locale}
                          intent="gainLoss"
                          className="text-[12.5px]"
                        />
                        <span
                          aria-hidden
                          className="hidden text-ink-3 lg:inline"
                        >
                          ·
                        </span>
                        <Figure
                          value={lot.unrealisedPercent}
                          kind="percent"
                          intent="gainLoss"
                          className="hidden text-[12.5px] lg:inline-flex"
                        />
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="border-b-0">
              <TableCell className={cn(CELL, OPENED_COL)} />
              <TableCell className={cn(CELL, "whitespace-normal")}>
                <span className="text-[12.5px] font-bold">Total</span>
                <span className="mt-1 block text-[11.5px] font-normal text-ink-3">
                  {position.openLots} open lots · {position.closedLots} closed
                </span>
              </TableCell>
              <TableCell className={NUM}>
                <Figure
                  kind="units"
                  value={position.totalUnits.value}
                  ticker={position.totalUnits.ticker}
                  className="text-[13px] font-semibold"
                />
              </TableCell>
              <TableCell className={cn(NUM, UNIT_COST_COL)}>
                <Figure value={null} className="text-[13px]" />
              </TableCell>
              <TableCell className={cn(NUM, BASIS_COL)}>
                <Figure
                  {...position.totalCostBasis}
                  className="text-[13px] font-semibold"
                />
              </TableCell>
              <TableCell className={cn(NUM, VALUE_COL)}>
                <Figure
                  {...position.totalMarketValue}
                  className="text-[13px] font-semibold"
                />
              </TableCell>
              <TableCell className={NUM}>
                <span className="inline-flex items-baseline gap-1.5">
                  <Figure
                    {...position.totalUnrealised}
                    intent="gainLoss"
                    className="text-[13px] font-semibold"
                  />
                  <span aria-hidden className="hidden text-ink-3 lg:inline">
                    ·
                  </span>
                  <Figure
                    value={position.totalUnrealisedPercent}
                    kind="percent"
                    intent="gainLoss"
                    className="hidden text-[13px] font-semibold lg:inline-flex"
                  />
                </span>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>

        <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-[11px] leading-[1.5] text-pretty text-ink-3 lg:flex-row lg:gap-6 lg:px-5">
          <span>
            Includes{" "}
            <Figure {...position.dealingFees} className="text-[12px]" /> of
            dealing fees in the cost basis. Excludes{" "}
            <Figure {...position.realisedOnClosedLot} className="text-[12px]" />{" "}
            realised on the closed lot and{" "}
            <Figure {...position.dividendIncome} className="text-[12px]" /> of
            dividends, both booked as income.
          </span>
          <span className="lg:flex-none">
            Valued at end-of-day prices, 24 Jul 2026.
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:mt-5 lg:grid-cols-4 lg:gap-5">
        {PROMISES.map((promise) => (
          <article
            key={promise.title}
            className="rounded-panel border border-border px-5 py-[18px]"
          >
            <CardTitle className="text-[13px]">{promise.title}</CardTitle>
            <CardBody className="text-[12.5px] lg:text-[12.5px]">
              {promise.body}
            </CardBody>
          </article>
        ))}
      </div>
    </LandingSection>
  )
}
