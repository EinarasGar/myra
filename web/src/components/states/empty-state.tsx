import type * as React from "react"

import { cn } from "@/lib/utils"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

import { StateActions, StateCard, type StateAction } from "./state-card"

export function EmptyState({
  icon,
  headline,
  body,
  actions = [],
  footnote,
  size = "default",
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "children"> & {
  icon?: React.ReactNode
  headline: React.ReactNode
  body?: React.ReactNode
  actions?: readonly StateAction[]
  footnote?: React.ReactNode
  size?: "default" | "page"
}) {
  const page = size === "page"

  return (
    <StateCard footnote={footnote} className={className} {...props}>
      <Empty
        className={cn(
          page ? "px-6 pt-[76px] pb-[72px]" : "px-6 pt-[38px] pb-[34px]"
        )}
      >
        {icon ? (
          <EmptyMedia
            className={cn(
              "text-ink-3",
              page
                ? "mb-3 [&_svg]:size-7 [&_svg]:stroke-[1.3]"
                : "mb-[9px] [&_svg]:size-6 [&_svg]:stroke-[1.4]"
            )}
          >
            {icon}
          </EmptyMedia>
        ) : null}
        <EmptyTitle className={cn(page ? "text-[14.5px]" : "text-[13.5px]")}>
          {headline}
        </EmptyTitle>
        {body ? (
          <EmptyDescription
            className={cn(page ? "max-w-[340px] text-[12.5px]" : "text-[12px]")}
          >
            {body}
          </EmptyDescription>
        ) : null}
        {actions.length > 0 ? (
          <EmptyContent>
            <StateActions
              actions={actions}
              className={cn("justify-center", page && "mt-4")}
            />
          </EmptyContent>
        ) : null}
      </Empty>
    </StateCard>
  )
}
