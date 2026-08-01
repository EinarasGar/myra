import type * as React from "react"

import { cn } from "@/lib/utils"

import { focusRing } from "./focus-ring"
import { useLoadMoreSentinel } from "./use-load-more-sentinel"

function TableLoadingFooter({
  label = "Loading more…",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & { label?: string }) {
  return (
    <div
      role="status"
      aria-busy
      className={cn(
        "flex min-h-[44px] items-center justify-center gap-2 bg-surface-2 px-[18px] py-[14px]",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className="size-[11px] animate-spin rounded-full border-[1.5px] border-border-strong border-t-brand"
      />
      <span className="text-[11.5px] leading-none font-medium text-ink-3">
        {label}
      </span>
    </div>
  )
}

export function InfiniteLoadFooter({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  label,
  note,
  busyLabel,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  label: React.ReactNode
  note?: React.ReactNode
  busyLabel?: string
}) {
  const sentinel = useLoadMoreSentinel<HTMLSpanElement>({
    enabled: hasNextPage && !isFetchingNextPage,
    onLoadMore,
  })

  if (!hasNextPage && !isFetchingNextPage) return null

  return (
    <div
      data-slot="infinite-load-footer"
      className={cn("relative bg-surface-2", className)}
      {...props}
    >
      <span
        ref={sentinel}
        aria-hidden
        data-slot="load-more-sentinel"
        className="pointer-events-none absolute inset-x-0 bottom-0 block h-px"
      />
      {isFetchingNextPage ? (
        <TableLoadingFooter
          {...(busyLabel === undefined ? {} : { label: busyLabel })}
        />
      ) : (
        <button
          type="button"
          onClick={onLoadMore}
          className={cn(
            "flex min-h-[44px] w-full items-center justify-center gap-[8px] px-[18px] py-[14px] text-[11.5px] leading-none font-semibold text-brand outline-hidden transition-colors duration-instant ease-out-quick hover:bg-[color-mix(in_oklch,var(--sv-panel-2),var(--sv-ink)_5%)]",
            focusRing.md
          )}
        >
          {label}
          {note === undefined ? null : (
            <span className="font-normal text-ink-3">{note}</span>
          )}
        </button>
      )}
    </div>
  )
}
