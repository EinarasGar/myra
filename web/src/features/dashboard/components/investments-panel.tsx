import { Link } from "@tanstack/react-router"

import { useBaseCurrency, useUserId } from "@/auth"
import { Figure } from "@/components/figure"
import {
  focusRing,
  Panel,
  PanelFootnote,
  PanelHeader,
  PanelTitle,
  HIT_TARGET_ROW,
} from "@/components/primitives"
import { LoadingState, SkeletonRows } from "@/components/states/loading-state"
import type { PortfolioOverviewView } from "@/features/portfolio/api"
import {
  useRequiredBaseAssetId,
  usePortfolioOverviewSuspense,
} from "@/features/portfolio/api"
import { cn } from "@/lib/utils"

export const INVESTMENTS_FOOTNOTE =
  "Market value of your holdings only — cash sitting in those accounts is counted under Accounts. Unrealised gain is lifetime, not this period."

export const OWNERSHIP_SHARE_NOTE = "Figures are your share of each account."

function TileLabel({ children }: { children: string }) {
  return (
    <div className="text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase">
      {children}
    </div>
  )
}

export function InvestmentsPanelView({
  overview,
  currency,
}: {
  overview: PortfolioOverviewView
  currency: string
}) {
  if (overview.assetCount === 0) return null

  return (
    <Panel data-slot="investments-panel">
      <PanelHeader>
        <PanelTitle>Investments</PanelTitle>
        <Link
          to="/portfolio"
          className={cn(
            "flex-none text-[11.5px] leading-none font-semibold whitespace-nowrap text-brand outline-none",
            HIT_TARGET_ROW,
            focusRing.chip
          )}
        >
          Portfolio →
        </Link>
      </PanelHeader>

      <div className="flex items-stretch">
        <div className="min-w-0 flex-1 border-e border-border px-[18px] py-[13px]">
          <TileLabel>Value</TileLabel>
          <Figure
            value={overview.totals.marketValue}
            currency={currency}
            size="md"
            className="mt-[9px] block text-[15px]"
          />
        </div>
        <div className="min-w-0 flex-1 px-[18px] py-[13px]">
          <TileLabel>Unrealised</TileLabel>
          <Figure
            value={overview.totals.unrealisedGains}
            currency={currency}
            intent="gainLoss"
            sign="always"
            size="md"
            className="mt-[9px] block text-[15px]"
          />
        </div>
      </div>

      <PanelFootnote>
        {INVESTMENTS_FOOTNOTE}
        {overview.appliesOwnershipShare ? ` ${OWNERSHIP_SHARE_NOTE}` : ""}
      </PanelFootnote>
    </Panel>
  )
}

export function InvestmentsPanelSkeleton() {
  return (
    <LoadingState label="Loading investments">
      <SkeletonRows count={2} height={30} />
    </LoadingState>
  )
}

export function InvestmentsPanel() {
  const userId = useUserId()
  const currency = useBaseCurrency()
  const defaultAssetId = useRequiredBaseAssetId()
  const overview = usePortfolioOverviewSuspense({ userId, defaultAssetId })

  return <InvestmentsPanelView overview={overview} currency={currency} />
}
