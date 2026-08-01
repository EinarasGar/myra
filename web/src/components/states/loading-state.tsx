import type * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

import { StateCard } from "./state-card"

export function SkeletonBar({
  width,
  height = 10,
  anchor = false,
  className,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  width?: number | string
  height?: number
  anchor?: boolean
}) {
  return (
    <Skeleton
      className={cn(anchor ? "bg-border-strong" : "bg-border", className)}
      style={{
        width: width ?? "100%",
        height,
        ...style,
      }}
      {...props}
    />
  )
}

export function SkeletonRows({
  count,
  height = 38,
  gap = 8,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  count: number
  height?: number
  gap?: number
}) {
  return (
    <div className={cn("flex flex-col", className)} style={{ gap }} {...props}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBar key={index} height={height} />
      ))}
    </div>
  )
}

export function LoadingState({
  label = "Loading",
  footnote,
  children,
  className,
  ...props
}: React.ComponentProps<"section"> & {
  label?: string
  footnote?: React.ReactNode
}) {
  return (
    <StateCard footnote={footnote} className={className} {...props}>
      <div
        role="status"
        aria-busy
        className="flex flex-col gap-[10px] px-[18px] pt-4 pb-[18px]"
      >
        <span className="sr-only">{label}</span>
        {children}
      </div>
    </StateCard>
  )
}
