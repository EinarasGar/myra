import type { ReactNode } from "react"

import { useUserId } from "@/auth"
import { Figure } from "@/components/figure"
import { Footnote } from "@/components/primitives"
import { usePortfolioHistory } from "@/features/portfolio/api"
import { cn } from "@/lib/utils"

import type { AccountBalancesView } from "./api"

const DELTA_RANGE = "1m"

function Tile({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("bg-surface px-4 pt-[14px] pb-[15px]", className)}>
      <div className="text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase">
        {label}
      </div>
      <div className="mt-[11px] flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {children}
      </div>
    </div>
  )
}

function TileNote({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10.5px] leading-none text-ink-3">{children}</span>
  )
}

function Count({ value }: { value: number }) {
  return (
    <Figure
      value={value}
      kind="plain"
      intent="meta"
      size="micro"
      className="text-[11px] font-normal"
    />
  )
}

function NetWorthDelta({ defaultAssetId }: { defaultAssetId: number }) {
  const userId = useUserId()
  const history = usePortfolioHistory({
    userId,
    defaultAssetId,
    range: DELTA_RANGE,
  })

  if (history.data === undefined) return null

  return (
    <>
      <Figure
        value={history.data.change}
        intent="gainLoss"
        size="micro"
        className="text-[12px]"
        arrow
      />
      <TileNote>over 30 days</TileNote>
    </>
  )
}

function CoverageFootnote({ balances }: { balances: AccountBalancesView }) {
  const listed = balances.accounts.length
  const hidden = balances.unmatchedAccountIds.length

  return (
    <Footnote data-slot="accounts-summary-footnote" className="mt-[10px]">
      Net worth counts every holding Sverto can value. Assets, Liabilities and
      Liquid today add up only the <Count value={listed} />{" "}
      {listed === 1 ? "account" : "accounts"} listed below, so Assets plus
      Liabilities need not come to net worth.
      {hidden > 0 ? (
        <>
          {" "}
          <Count value={hidden} /> deactivated{" "}
          {hidden === 1 ? "account holds" : "accounts hold"}{" "}
          <Figure
            value={balances.unmatchedValue}
            intent="secondary"
            size="micro"
            className="text-[11px] font-normal"
          />{" "}
          that net worth counts and this page cannot list — exactly the gap
          between net worth and Assets plus Liabilities.
        </>
      ) : null}
      {balances.ratelessCount > 0 ? (
        <>
          {" "}
          <Count value={balances.ratelessCount} />{" "}
          {balances.ratelessCount === 1 ? "holding has" : "holdings have"} no
          rate path to your base currency, so all four figures are short by
          whatever they are worth.
        </>
      ) : null}
    </Footnote>
  )
}

export function AccountsSummary({
  balances,
  defaultAssetId,
}: {
  balances: AccountBalancesView
  defaultAssetId: number
}) {
  return (
    <div data-slot="accounts-summary">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <Tile label="Net worth" className="col-span-2 xl:col-span-1">
          <Figure
            value={balances.netWorth}
            size="md"
            className="text-[27px] tracking-[-0.03em]"
          />
          <NetWorthDelta defaultAssetId={defaultAssetId} />
        </Tile>
        <Tile label="Assets">
          <Figure value={balances.assetsTotal} size="md" />
          <TileNote>listed accounts</TileNote>
        </Tile>
        <Tile label="Liabilities">
          <Figure value={balances.liabilitiesTotal} size="md" />
          <TileNote>listed accounts</TileNote>
        </Tile>
        <Tile label="Liquid today" className="col-span-2 xl:col-span-1">
          <Figure value={balances.liquidTotal} size="md" />
          <TileNote>current, savings and cash accounts</TileNote>
        </Tile>
      </div>
      <CoverageFootnote balances={balances} />
    </div>
  )
}
