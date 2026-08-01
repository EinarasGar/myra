import { cn } from "@/lib/utils"

export function SeriesSwatch({
  color,
  size = 8,
  className,
}: {
  color: string
  size?: number
  className?: string
}) {
  return (
    <svg
      data-slot="series-swatch"
      aria-hidden
      viewBox="0 0 8 8"
      style={{ width: size, height: size }}
      className={cn("flex-none", className)}
    >
      <rect x="0" y="0" width="8" height="8" rx="2" fill={color} />
    </svg>
  )
}
