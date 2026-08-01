import type * as React from "react"

import { cn } from "@/lib/utils"

import {
  CONTENT_MAX_WIDTH,
  PAGE_PADDING_BOTTOM,
  PAGE_PADDING_X,
} from "./breakpoints"

export function PageContainer({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-container"
      className={cn(PAGE_PADDING_X, PAGE_PADDING_BOTTOM, className)}
      {...props}
    >
      <div className={cn(CONTENT_MAX_WIDTH, "min-w-0")}>{children}</div>
    </div>
  )
}
