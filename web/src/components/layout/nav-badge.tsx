import type * as React from "react"

import { areMockMarkersVisible, mockMarkerProps, type MockId } from "@/lib/mock"
import { cn } from "@/lib/utils"

const BADGE_BASE =
  "pointer-events-none absolute inline-flex items-center justify-center rounded-full border-2 text-center font-mono font-bold tabular-nums"

const REAL_BADGE = "border-background bg-attention text-on-brand"

const MOCKED_BADGE =
  "border-dashed border-attention bg-attention-dim text-attention ring-2 ring-background"

export function NavBadge({
  count,
  mockId,
  isLowerBound = false,
  placement = "rail",
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  count: number
  mockId: MockId | null
  /** The queue behind this count has unread pages, so it is a floor, not a total. */
  isLowerBound?: boolean
  placement?: "rail" | "tab"
}) {
  if (count <= 0) return null

  const marked = mockId !== null && areMockMarkersVisible()
  const label =
    count > 99 ? "99+" : `${String(count)}${isLowerBound ? "+" : ""}`

  return (
    <span
      data-slot="nav-badge"
      aria-hidden
      {...mockMarkerProps(mockId)}
      className={cn(
        BADGE_BASE,
        marked ? MOCKED_BADGE : REAL_BADGE,
        placement === "rail"
          ? "-top-0.5 -right-0.5 h-[15px] min-w-[15px] px-1 text-[9px] leading-[15px]"
          : "top-[9px] right-[26%] h-[14px] min-w-[14px] px-1 text-[8.5px] leading-[14px]",
        className
      )}
      {...props}
    >
      {label}
    </span>
  )
}
