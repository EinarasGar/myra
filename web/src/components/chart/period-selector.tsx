import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

import {
  CHART_PERIODS,
  CHART_PERIOD_LABELS,
  CHART_PERIOD_TITLES,
  type ChartPeriod,
} from "./periods"

export interface PeriodSelectorProps {
  value: ChartPeriod
  onValueChange: (period: ChartPeriod) => void
  periods?: readonly ChartPeriod[]
  label?: string
  className?: string
}

export function PeriodSelector({
  value,
  onValueChange,
  periods = CHART_PERIODS,
  label = "Chart period",
  className,
}: PeriodSelectorProps) {
  return (
    <ToggleGroup
      data-slot="period-selector"
      aria-label={label}
      value={[value]}
      spacing={4}
      onValueChange={(next) => {
        const [chosen] = next
        if (chosen !== undefined && chosen !== value) {
          onValueChange(chosen as ChartPeriod)
        }
      }}
      className={cn("rounded-none", className)}
    >
      {periods.map((period) => (
        <ToggleGroupItem
          key={period}
          value={period}
          title={CHART_PERIOD_TITLES[period]}
          className={cn(
            "relative h-auto min-w-0 rounded-none bg-transparent px-0 pb-[3px] font-mono text-[11px] leading-none text-ink-3 transition-colors duration-instant ease-out-quick",
            "border-b-[1.5px] border-transparent hover:bg-transparent hover:text-ink-2",
            "after:absolute after:-inset-x-[6px] after:-inset-y-[17px] after:content-['']",
            "aria-pressed:border-brand aria-pressed:bg-transparent aria-pressed:font-semibold aria-pressed:text-ink"
          )}
        >
          {CHART_PERIOD_LABELS[period]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
