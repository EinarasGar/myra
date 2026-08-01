import { startTransition } from "react"

import { useAuthMe, useBaseCurrency, useUserId } from "@/auth"
import type { ChartPeriod } from "@/components/chart"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { usePeriodSearch } from "@/components/layout/search-state"
import {
  useRequiredBaseAssetId,
  usePortfolioHistorySuspense,
} from "@/features/portfolio/api"
import { useLedger } from "@/features/transactions/api"
import { REVIEW_LEDGER_PAGE_SIZE } from "@/features/transactions/review/api"

import { greetingFor, useNeedsYou, useNetWorthAttribution } from "./api"
import {
  AccountsPanel,
  AccountsPanelSkeleton,
} from "./components/accounts-panel"
import {
  DashboardHero,
  DashboardHeroSkeleton,
} from "./components/dashboard-hero"
import {
  InvestmentsPanel,
  InvestmentsPanelSkeleton,
} from "./components/investments-panel"
import { NeedsYouStrip } from "./components/needs-you-strip"
import { RecentPanel, RecentPanelSkeleton } from "./components/recent-panel"

function HeroSection({
  greeting,
  period,
  onPeriodChange,
}: {
  greeting: string
  period: ChartPeriod
  onPeriodChange: (period: ChartPeriod) => void
}) {
  const userId = useUserId()
  const currency = useBaseCurrency()
  const defaultAssetId = useRequiredBaseAssetId()
  const series = usePortfolioHistorySuspense({
    userId,
    defaultAssetId,
    range: period,
  })
  const attribution = useNetWorthAttribution(series)

  return (
    <DashboardHero
      greeting={greeting}
      series={series}
      currency={currency}
      period={period}
      onPeriodChange={onPeriodChange}
      attribution={attribution}
    />
  )
}

export function DashboardScreen() {
  const userId = useUserId()
  const me = useAuthMe(true)
  const [period, setPeriod] = usePeriodSearch()

  /**
   * The same page "Needs you" already reads. Asking for a smaller one here would be
   * a second request for a prefix of rows the screen has in hand.
   */
  const ledger = useLedger({ userId, limit: REVIEW_LEDGER_PAGE_SIZE })
  const needsYou = useNeedsYou(userId)
  const greeting = greetingFor(me.data?.user_metadata?.username)

  const changePeriod = (next: ChartPeriod) => {
    startTransition(() => {
      setPeriod(next)
    })
  }

  return (
    <div data-slot="dashboard" className="pt-3">
      <PanelBoundary
        pending={
          <DashboardHeroSkeleton
            period={period}
            onPeriodChange={changePeriod}
          />
        }
      >
        <HeroSection
          greeting={greeting}
          period={period}
          onPeriodChange={changePeriod}
        />
      </PanelBoundary>

      <NeedsYouStrip needsYou={needsYou} />

      <div className="mt-[26px] grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[5fr_7fr] xl:gap-6">
        <div className="flex min-w-0 flex-col gap-4 xl:gap-5">
          <PanelBoundary pending={<AccountsPanelSkeleton />}>
            <AccountsPanel />
          </PanelBoundary>
          <PanelBoundary pending={<InvestmentsPanelSkeleton />}>
            <InvestmentsPanel />
          </PanelBoundary>
        </div>

        <PanelBoundary pending={<RecentPanelSkeleton />}>
          <RecentPanel ledger={ledger} />
        </PanelBoundary>
      </div>
    </div>
  )
}
