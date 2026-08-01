import type { ShellWidth } from "@/components/layout/breakpoints"

export const QUEUE_COLUMNS = {
  full: "20px minmax(0,1fr) 128px 138px 116px",
  tight: "20px minmax(0,1fr) 128px 116px",
  stacked: "20px minmax(0,1fr) 116px",
  phone: "minmax(0,1fr) 104px",
} as const

export const QUEUE_ROWS_DRAWN: Record<ShellWidth, number> = {
  full: 5,
  tight: 5,
  stacked: 4,
  phone: 3,
}

export function queueCellCount(width: ShellWidth): number {
  if (width === "full") return 5
  if (width === "tight") return 4
  if (width === "stacked") return 3
  return 2
}
