import {
  AlignLeft,
  CreditCard,
  House,
  Sparkle,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import { mockAttributes, MOCK_LANDING_SNAPSHOT } from "@/lib/mock"
import { cn } from "@/lib/utils"
import { Figure } from "@/components/figure"
import { SvertoMark } from "@/components/layout/sverto-mark"

import { MetaLabel } from "../section"
import { sparkGeometry } from "../spark"

const RAIL_ICONS: readonly { id: string; Icon: LucideIcon }[] = [
  { id: "dashboard", Icon: House },
  { id: "ledger", Icon: AlignLeft },
  { id: "portfolio", Icon: TrendingUp },
  { id: "accounts", Icon: CreditCard },
]

const TILE = "rounded-panel border border-border bg-surface px-4 py-3.5"

export function ProductShot() {
  const snapshot = MOCK_LANDING_SNAPSHOT
  const spark = sparkGeometry(snapshot.chart.points)

  return (
    <figure
      {...mockAttributes("landing.demo-ledger")}
      className="mt-10 lg:mt-16"
    >
      <div className="overflow-hidden rounded-sheet border border-border-strong bg-surface md:rounded-2xl md:shadow-popover">
        <div className="hidden h-[38px] items-center gap-2 border-b border-border bg-surface-2 px-3.5 md:flex">
          <span className="size-[9px] rounded-full bg-border-strong" />
          <span className="size-[9px] rounded-full bg-border-strong" />
          <span className="size-[9px] rounded-full bg-border-strong" />
          <div className="flex flex-1 justify-center">
            <span className="rounded-sm bg-background px-3.5 py-1 font-mono text-[11px] leading-none text-ink-3">
              app.sverto.com/dashboard
            </span>
          </div>
        </div>

        <div className="flex bg-background">
          <div className="hidden w-[58px] flex-none flex-col items-center gap-1.5 border-r border-border py-4 lg:flex">
            <SvertoMark className="mb-3 size-[22px]" />
            {RAIL_ICONS.map(({ id, Icon }, index) => (
              <span
                key={id}
                className={cn(
                  "flex size-[34px] items-center justify-center rounded-panel",
                  index === 0 ? "bg-brand-dim text-brand" : "text-ink-3"
                )}
              >
                <Icon className="size-4" strokeWidth={1.8} aria-hidden />
              </span>
            ))}
            <span className="flex-1" />
            <span className="flex size-[34px] items-center justify-center rounded-panel text-brand">
              <Sparkle className="size-4" strokeWidth={1.8} aria-hidden />
            </span>
            <span className="flex size-[27px] items-center justify-center rounded-sm border border-border bg-surface-2 text-[10px] leading-none font-semibold text-ink-2">
              EK
            </span>
          </div>

          <div className="min-w-0 flex-1 p-4 md:p-5 lg:px-8 lg:pt-[22px] lg:pb-7">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <MetaLabel className="text-[10px] tracking-[0.14em]">
                  {snapshot.dayLabel}
                </MetaLabel>
                <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2 lg:mt-3.5">
                  <Figure {...snapshot.netWorth} size="hero" />
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pb-1">
                    <Figure
                      {...snapshot.periodDelta}
                      intent="gainLoss"
                      arrow
                      className="text-[13px] font-semibold lg:text-[14px]"
                    />
                    <span className="text-[12px] leading-none text-ink-2 lg:text-[13px]">
                      <span aria-hidden>· </span>
                      <Figure
                        value={snapshot.periodDeltaPercent}
                        kind="percent"
                        intent="gainLoss"
                        decimals={2}
                        className="text-[12px] lg:text-[13px]"
                      />{" "}
                      {snapshot.periodLabel}
                    </span>
                  </span>
                </div>
                <p className="mt-3 text-[12.5px] leading-[1.5] text-ink-2 lg:text-[13px]">
                  <Figure {...snapshot.saved} className="text-[12.5px]" /> of
                  that you saved.{" "}
                  <Figure {...snapshot.earned} className="text-[12.5px]" /> your
                  assets earned.{" "}
                  <span className="font-semibold text-brand">Why ▾</span>
                </p>
              </div>
              <div className="hidden flex-none gap-4 pt-6 font-mono md:flex">
                {snapshot.chart.periods.map((period) => (
                  <span
                    key={period}
                    className={cn(
                      "text-[11px] leading-none",
                      period === snapshot.chart.activePeriod
                        ? "border-b-[1.5px] border-brand pb-[3px] font-semibold text-ink"
                        : "font-medium text-ink-3"
                    )}
                  >
                    {period}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 lg:mt-[18px]">
              <svg
                viewBox={spark.viewBox}
                preserveAspectRatio="none"
                aria-hidden
                className="block h-[84px] w-full md:h-[120px] lg:h-[140px] xl:h-[170px]"
              >
                <path d={spark.area} className="fill-brand/10" />
                <path
                  d={spark.line}
                  fill="none"
                  className="stroke-brand"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="mt-2 hidden justify-between font-mono text-[10.5px] leading-none text-ink-3 lg:flex">
                {snapshot.chart.axisLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 min-[360px]:grid-cols-2 lg:mt-6 lg:grid-cols-4 lg:gap-4">
              <div className={TILE}>
                <MetaLabel>
                  Cash · {snapshot.cashCurrencies.length} currencies
                </MetaLabel>
                <Figure
                  {...snapshot.cash}
                  className="mt-2.5 block text-[17px] font-semibold tracking-[-0.02em] lg:text-[20px]"
                />
                <p className="mt-2 text-[10.5px] leading-[1.5] text-ink-3">
                  {snapshot.cashCurrencies.join(" · ")}
                </p>
              </div>
              <div className={TILE}>
                <MetaLabel>Investments</MetaLabel>
                <Figure
                  {...snapshot.investments}
                  className="mt-2.5 block text-[17px] font-semibold tracking-[-0.02em] lg:text-[20px]"
                />
                <p className="mt-2 text-[10.5px] leading-[1.5]">
                  <Figure
                    {...snapshot.unrealised}
                    intent="gainLoss"
                    className="text-[12px]"
                  />{" "}
                  <span className="text-ink-3">unrealised</span>
                </p>
              </div>
              <div className={TILE}>
                <MetaLabel>Spent in July</MetaLabel>
                <Figure
                  {...snapshot.spentInMonth}
                  className="mt-2.5 block text-[17px] font-semibold tracking-[-0.02em] lg:text-[20px]"
                />
                <p className="mt-2 text-[10.5px] leading-[1.5] text-ink-3">
                  <Figure
                    value={snapshot.spentChangePercent}
                    kind="percent"
                    className="text-[12px] text-ink-3"
                  />{" "}
                  vs June
                </p>
              </div>
              <div className="rounded-panel border border-attention bg-attention-dim px-4 py-3.5">
                <MetaLabel className="text-attention">Needs you</MetaLabel>
                <Figure
                  value={snapshot.needsYou}
                  kind="plain"
                  className="mt-2.5 block text-[17px] font-semibold tracking-[-0.02em] lg:text-[20px]"
                />
                <p className="mt-2 text-[10.5px] leading-[1.5] text-ink-2">
                  {snapshot.needsYouNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-[11px] leading-[1.5] text-ink-3">
        Illustrative ledger. Not a real customer account.
      </figcaption>
    </figure>
  )
}
