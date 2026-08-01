import { Figure } from "@/components/figure"
import { cn } from "@/lib/utils"

export type ShareBarVariant = "row" | "pivot"

export interface ShareBarProps {
  value: number
  variant?: ShareBarVariant
  color?: string
  label: string
  locale?: string
  className?: string
}

export function ShareBar({
  value,
  variant = "row",
  color,
  label,
  locale,
  className,
}: ShareBarProps) {
  const share = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
  const pivot = variant === "pivot"

  return (
    <div
      data-slot="share-bar"
      data-variant={variant}
      className={cn("flex items-center gap-[9px]", className)}
    >
      <div
        role="img"
        aria-label={label}
        className={cn(
          "bg-border",
          pivot ? "h-[4px] w-[104px] flex-none rounded-full" : "h-[3px] w-full"
        )}
      >
        <div
          data-slot="share-bar-fill"
          className={cn("h-full", pivot && "rounded-full")}
          style={{
            width: `${share * 100}%`,
            backgroundColor: color ?? "var(--color-brand)",
          }}
        />
      </div>
      {pivot ? (
        <Figure
          value={share}
          kind="percent"
          scale="ratio"
          intent="meta"
          size="micro"
          locale={locale}
          className="w-[34px] flex-none text-right"
        />
      ) : null}
    </div>
  )
}
