import { useUserId } from "@/auth"
import { Figure } from "@/components/figure"

import { quotaTone, useAiUsage } from "./api"
import { SettingsQuotaBar } from "./blocks"
import { resetLabel } from "./presentation"

/**
 * The profile menu duplicates only what is checked often. Usage fails quietly here:
 * a dead AI service must not take the account menu with it.
 */
export function ProfileUsageSummary() {
  const usage = useAiUsage(useUserId())
  const view = usage.data
  if (view === undefined) return null

  const hourly = view.windows.find((window) => window.id === "hourly")

  return (
    <div className="border-b border-border px-[15px] py-[13px]">
      <div className="flex items-baseline gap-2">
        <span className="text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase">
          Myra usage
        </span>
        <span className="flex-1" />
        <span className="text-[10.5px] leading-none text-ink-3">
          {hourly === undefined
            ? "reset time unknown"
            : `hourly ${resetLabel(hourly.resetAt)}`}
        </span>
      </div>
      <div className="mt-2.5 flex flex-col gap-2.5">
        {view.windows.map((window) => (
          <SettingsQuotaBar
            key={window.id}
            label={window.label}
            ratio={window.peakRatio}
            tone={quotaTone(window.peakRatio)}
            value={
              <Figure
                value={window.peakRatio}
                kind="percent"
                scale="ratio"
                decimals={0}
                intent="meta"
                size="micro"
              />
            }
          />
        ))}
      </div>
    </div>
  )
}
