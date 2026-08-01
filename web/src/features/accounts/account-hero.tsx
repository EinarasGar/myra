import { startTransition } from "react"

import { useBaseCurrency, useUserId } from "@/auth"
import {
  HeroChart,
  HeroChartSkeleton,
  type ChartPeriod,
} from "@/components/chart"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { usePeriodSearch } from "@/components/layout/search-state"
import {
  historyChartPoints,
  useAccountPortfolioHistorySuspense,
  useRequiredBaseAssetId,
} from "@/features/portfolio/api"
import type { AccountClass } from "@/lib/domain/accounts"

import { accountBalanceLabel } from "./presentation"

function AccountHeroChart({
  accountId,
  accountClass,
  period,
  onPeriodChange,
}: {
  accountId: string
  accountClass: AccountClass
  period: ChartPeriod
  onPeriodChange: (next: ChartPeriod) => void
}) {
  const userId = useUserId()
  const defaultAssetId = useRequiredBaseAssetId()
  const baseCurrency = useBaseCurrency()
  const series = useAccountPortfolioHistorySuspense({
    userId,
    accountId,
    defaultAssetId,
    range: period,
  })
  const isLiability = accountClass === "liabilities"

  return (
    <HeroChart
      data={historyChartPoints(series)}
      currency={baseCurrency}
      label={accountBalanceLabel(accountClass)}
      shape={isLiability ? "liability" : "asset"}
      size="tall"
      period={period}
      onPeriodChange={onPeriodChange}
      emptyLabel="No history for this account in this period"
    />
  )
}

export function AccountHero({
  accountId,
  accountClass,
}: {
  accountId: string
  accountClass: AccountClass
}) {
  const [period, setPeriod] = usePeriodSearch()

  const changePeriod = (next: ChartPeriod) => {
    startTransition(() => {
      setPeriod(next)
    })
  }

  return (
    <PanelBoundary
      pending={
        <HeroChartSkeleton
          size="tall"
          label="Loading account history"
          period={period}
          onPeriodChange={changePeriod}
        />
      }
    >
      <AccountHeroChart
        accountId={accountId}
        accountClass={accountClass}
        period={period}
        onPeriodChange={changePeriod}
      />
    </PanelBoundary>
  )
}
