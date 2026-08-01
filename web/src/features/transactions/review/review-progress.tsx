import { cn } from "@/lib/utils"
import { Figure } from "@/components/figure"
import { HIT_TARGET_ROW } from "@/components/primitives"
import { Button } from "@/components/ui/button"

export function ReviewProgress({
  position,
  total,
  totalIsLowerBound = false,
  onSkipAll,
}: {
  position: number
  total: number
  /** The queue has unread ledger pages, so the denominator can still grow. */
  totalIsLowerBound?: boolean
  onSkipAll: () => void
}) {
  const percent = total === 0 ? 0 : Math.min(1, position / total)

  return (
    <div
      data-slot="review-progress"
      className="mb-[13px] flex items-center gap-3"
    >
      <p className="flex flex-none items-center gap-1 text-[12px] leading-none text-ink-2">
        Reviewing <Figure kind="plain" value={position} /> of{" "}
        <span className="flex items-baseline">
          <Figure kind="plain" value={total} />
          {totalIsLowerBound ? <span aria-hidden>+</span> : null}
        </span>
        {totalIsLowerBound ? (
          <span className="text-ink-3">found so far</span>
        ) : null}
      </p>
      <span
        role="progressbar"
        aria-valuenow={position}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Review queue progress"
        className="h-[3px] flex-1 overflow-hidden rounded-full bg-border"
      >
        <span
          aria-hidden
          className="block h-full rounded-full bg-attention"
          style={{ width: `${String(Math.round(percent * 100))}%` }}
        />
      </span>
      <Button
        variant="ghost"
        onClick={onSkipAll}
        className={cn(
          "h-auto flex-none rounded-sm px-0 text-[11.5px] leading-none font-medium whitespace-nowrap text-ink-3 hover:bg-transparent",
          HIT_TARGET_ROW
        )}
      >
        Skip all for now
      </Button>
    </div>
  )
}
