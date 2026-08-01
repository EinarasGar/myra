import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

import { areMockMarkersVisible, mockTitle } from "./markers"
import type { MockId } from "./registry"

export interface MockBadgeProps extends ComponentProps<"span"> {
  id: MockId
  label?: string
}

export function MockBadge({
  id,
  label = "Example",
  className,
  ...props
}: MockBadgeProps) {
  if (!areMockMarkersVisible()) return null
  return (
    <span
      data-slot="mock-badge"
      data-mock={id}
      title={mockTitle(id)}
      className={cn(
        "inline-flex flex-none items-center rounded-full bg-attention-dim px-[6px] py-[2px] align-middle font-mono text-[9px] leading-[13px] font-semibold tracking-[0.06em] whitespace-nowrap text-attention uppercase select-none",
        className
      )}
      {...props}
    >
      {label}
    </span>
  )
}
