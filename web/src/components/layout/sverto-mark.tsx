import type * as React from "react"

import { cn } from "@/lib/utils"

export function SvertoMark({
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "viewBox">) {
  return (
    <svg
      viewBox="80 80 352 352"
      aria-hidden
      className={cn("text-brand", className)}
      {...props}
    >
      <circle
        cx="256"
        cy="256"
        r="146"
        fill="none"
        stroke="currentColor"
        strokeWidth="28"
      />
      <line
        x1="104"
        y1="334"
        x2="408"
        y2="178"
        stroke="currentColor"
        strokeWidth="28"
        strokeLinecap="round"
      />
      <circle cx="256" cy="256" r="28" fill="currentColor" />
    </svg>
  )
}
