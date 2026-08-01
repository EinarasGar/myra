import type { ReactNode } from "react"

import { Figure } from "@/components/figure"
import type { AssetHolding } from "@/features/portfolio/api"
import { countOf, EM_DASH, formatMonthStamp } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { LotTotals } from "./lots"
import { monthsHeld, ratioOf } from "./lots"
import { TILE_GRID } from "./presentation"

function Tile({
  label,
  value,
  sub,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
}) {
  return (
    <div
      data-slot="asset-tile"
      data-tile={label}
      className="bg-surface px-4 pt-[14px] pb-[15px]"
    >
      <div className="text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase">
        {label}
      </div>
      <div className="mt-[10px] flex items-baseline gap-2">
        {value}
        {sub === undefined ? null : (
          <span className="font-mono text-[11px] leading-none font-medium whitespace-nowrap text-ink-3 tabular-nums">
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

export function AssetTiles({
  holding,
  totals,
  currency,
  ticker,
  now = new Date(),
}: {
  holding: AssetHolding
  totals: LotTotals
  currency: string
  ticker: string | null
  now?: Date
}) {
  const months = monthsHeld(holding.heldSince, now)

  return (
    <div
      data-slot="asset-tiles"
      className={cn(
        "grid gap-px overflow-hidden rounded-panel border border-border bg-border",
        TILE_GRID
      )}
    >
      <Tile
        label="Value"
        value={
          <Figure size="md" value={holding.marketValue} currency={currency} />
        }
        sub={
          <Figure
            value={holding.unitsRemaining}
            kind="units"
            ticker={ticker}
            intent="meta"
            size="micro"
          />
        }
      />
      <Tile
        label="Cost basis"
        value={
          <Figure
            size="md"
            value={holding.totalCostBasis}
            currency={currency}
          />
        }
        sub={
          <>
            avg{" "}
            <Figure
              value={holding.averageUnitCost}
              currency={currency}
              intent="meta"
              size="micro"
            />
          </>
        }
      />
      <Tile
        label="Unrealised P&amp;L"
        value={
          <Figure
            size="md"
            value={holding.unrealisedGains}
            currency={currency}
            intent="gainLoss"
          />
        }
        sub={
          <Figure
            value={ratioOf(holding.unrealisedGains, holding.totalCostBasis)}
            kind="percent"
            scale="ratio"
            intent="gainLoss"
            size="micro"
          />
        }
      />
      <Tile
        label="Realised P&amp;L"
        value={
          <Figure
            size="md"
            value={holding.realisedGains}
            currency={currency}
            intent="gainLoss"
          />
        }
        sub={`across ${String(totals.lotsWithSales)} of ${countOf(totals.lotCount, "lot")}`}
      />
      <Tile
        label="Dividends"
        value={
          <Figure
            size="md"
            value={holding.cashDividends}
            currency={currency}
            intent="gainLoss"
          />
        }
        sub={
          totals.dividendLots === 0
            ? "no dividend lots"
            : countOf(totals.dividendLots, "dividend lot")
        }
      />
      <Tile
        label="Fees"
        value={
          <Figure size="md" value={holding.totalFees} currency={currency} />
        }
        sub={`across ${countOf(totals.lotsChargedFees, "lot")}`}
      />
      <Tile
        label="Total gain"
        value={
          <Figure
            size="md"
            value={holding.totalGains}
            currency={currency}
            intent="gainLoss"
          />
        }
        sub={
          <Figure
            value={holding.returnRatio}
            kind="percent"
            scale="ratio"
            intent="gainLoss"
            size="micro"
          />
        }
      />
      <Tile
        label="Held since"
        value={
          <span
            data-figure=""
            className="font-mono text-[17px] leading-none font-semibold tracking-[-0.015em] whitespace-nowrap tabular-nums"
          >
            {holding.heldSince === null
              ? EM_DASH
              : formatMonthStamp(holding.heldSince)}
          </span>
        }
        sub={
          months === null
            ? undefined
            : `${String(months)} ${months === 1 ? "month" : "months"}`
        }
      />
    </div>
  )
}
