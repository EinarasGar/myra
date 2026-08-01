import type { ReactNode } from "react"

import { Figure } from "@/components/figure"
import { Footnote } from "@/components/primitives"
import type { PortfolioOverviewView } from "@/features/portfolio/api"
import { nativeAmount, nativeFigureProps } from "@/features/transactions/api"
import { unresolvedAssetRef } from "@/lib/domain/refs"
import { countOf, formatDateStamp } from "@/lib/format"
import type { MockAccountMetadata } from "@/lib/mock"
import { mockAccountMetadata, MockBadge, mockAttributes } from "@/lib/mock"
import { cn } from "@/lib/utils"

import type { AccountDetail } from "./api"
import {
  accountBalanceLabel,
  hasLiabilityTerms,
  ordinalSuffix,
} from "./presentation"

const METADATA_MOCK = "accounts.financial-metadata"

function Tile({
  label,
  note,
  mocked = false,
  children,
  className,
}: {
  label: ReactNode
  note?: ReactNode
  mocked?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("bg-surface px-4 pt-[14px] pb-[15px]", className)}
      {...(mocked ? mockAttributes(METADATA_MOCK) : {})}
    >
      <div className="flex items-center gap-[6px] text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase">
        {label}
        {mocked ? <MockBadge id={METADATA_MOCK} /> : null}
      </div>
      <div className="mt-[10px] flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {children}
        {note === undefined ? null : (
          <span className="text-[11px] leading-none text-ink-3">{note}</span>
        )}
      </div>
    </div>
  )
}

function TileStrip({
  children,
  columns,
}: {
  children: ReactNode
  columns: 1 | 2 | 4
}) {
  return (
    <div
      data-slot="account-tiles"
      className={cn(
        "grid gap-px overflow-hidden rounded-panel border border-border bg-border",
        columns === 4 && "grid-cols-2 lg:grid-cols-4",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 1 && "grid-cols-1"
      )}
    >
      {children}
    </div>
  )
}

function CashFigures({ overview }: { overview: PortfolioOverviewView }) {
  if (overview.cash.length === 0) return <Figure value={null} size="md" />

  return (
    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {overview.cash.map((position) => (
        <Figure
          key={`${position.accountId}-${String(position.assetId)}`}
          {...nativeFigureProps(
            nativeAmount(
              position.units,
              position.asset ?? unresolvedAssetRef(position.assetId)
            )
          )}
          size="md"
        />
      ))}
    </span>
  )
}

function LiabilityTiles({
  balance,
  metadata,
}: {
  balance: number | null
  metadata: MockAccountMetadata | null
}) {
  if (!hasLiabilityTerms(metadata)) {
    return (
      <>
        <TileStrip columns={1}>
          <Tile label="Balance owed">
            <Figure value={balance} size="md" />
          </Tile>
        </TileStrip>
        <Footnote>
          Sverto stores a name, a type and your ownership share for an account —
          nothing else. Interest rate, term, monthly payment and original
          principal have nowhere to live yet, so this page cannot show them.
        </Footnote>
      </>
    )
  }

  return (
    <>
      <TileStrip columns={4}>
        <Tile
          label="Balance owed"
          note={
            metadata.originalPrincipal === undefined ? undefined : (
              <span {...mockAttributes(METADATA_MOCK)}>
                of <Figure value={metadata.originalPrincipal} size="micro" />{" "}
                borrowed
              </span>
            )
          }
        >
          <Figure value={balance} size="md" />
        </Tile>
        <Tile label="Interest rate" note={metadata.interestRateNote} mocked>
          <Figure
            value={metadata.interestRatePercent ?? null}
            kind="percent"
            scale="percent"
            size="md"
          />
        </Tile>
        <Tile
          label="Monthly payment"
          mocked
          note={
            metadata.paymentDayOfMonth === undefined
              ? undefined
              : `on the ${String(metadata.paymentDayOfMonth)}${ordinalSuffix(metadata.paymentDayOfMonth)}`
          }
        >
          <Figure value={metadata.monthlyPayment ?? null} size="md" />
        </Tile>
        <Tile
          label="Interest this year"
          mocked
          note={
            metadata.interestPaymentsThisYear === undefined
              ? undefined
              : countOf(metadata.interestPaymentsThisYear, "payment")
          }
        >
          <Figure value={metadata.interestThisYear ?? null} size="md" />
        </Tile>
      </TileStrip>
      <Footnote>
        Only the balance is real. Rate, payment and interest are placeholders
        with nowhere to be stored, so nothing here can change them.
      </Footnote>
    </>
  )
}

export function AccountTiles({
  account,
  overview,
  balance,
}: {
  account: AccountDetail
  overview: PortfolioOverviewView
  balance: number | null
}) {
  const metadata = mockAccountMetadata(account.name)

  if (account.isLiability) {
    return <LiabilityTiles balance={balance} metadata={metadata} />
  }

  const label = accountBalanceLabel(account.accountClass)

  if (overview.positions.length === 0) {
    return (
      <>
        <TileStrip columns={2}>
          <Tile label={label}>
            <Figure value={balance} size="md" />
          </Tile>
          <Tile label="Cash held" note="in its own currency">
            <CashFigures overview={overview} />
          </Tile>
        </TileStrip>
        <Footnote>
          {label} converts every holding to your base currency at today&rsquo;s
          rates; cash is shown unconverted.{" "}
          {metadata?.valuedOn === undefined ? null : (
            <span {...mockAttributes(METADATA_MOCK)}>
              Last valued {formatDateStamp(metadata.valuedOn)} — a placeholder
              date, not a stored one.
            </span>
          )}
        </Footnote>
      </>
    )
  }

  return (
    <>
      <TileStrip columns={4}>
        <Tile label={label}>
          <Figure value={balance} size="md" />
        </Tile>
        <Tile
          label="Cost basis"
          note={`${String(overview.assetCount)} asset${overview.assetCount === 1 ? "" : "s"}`}
        >
          <Figure value={overview.totals.totalCostBasis} size="md" />
        </Tile>
        <Tile label="Unrealised P&L">
          <Figure
            value={overview.totals.unrealisedGains}
            intent="gainLoss"
            size="md"
          />
          <Figure
            value={overview.totals.returnRatio}
            kind="percent"
            scale="ratio"
            intent="gainLoss"
            size="micro"
          />
        </Tile>
        <Tile label="Total fees" note="lifetime">
          <Figure value={overview.totals.totalFees} size="md" />
        </Tile>
      </TileStrip>
      <Footnote>
        {label} counts every holding, cash included, at your ownership share.
        Cost basis, P&amp;L and fees cover the priced positions only, are
        lifetime figures, and describe the whole account rather than your share.
      </Footnote>
    </>
  )
}
