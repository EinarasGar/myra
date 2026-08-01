import { useState, type ReactElement } from "react"
import { Link, useRouterState } from "@tanstack/react-router"

import { MockBadge } from "@/lib/mock"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { focusRing } from "@/components/primitives/focus-ring"

import { NavBadge } from "./nav-badge"
import { isDestinationActive, MENU_NAV, navBadgeLabel } from "./navigation"
import { useReviewQueue } from "./review-queue"
import { SvertoMark } from "./sverto-mark"

export function NavDrawer({ trigger }: { trigger: ReactElement }) {
  const [open, setOpen] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const review = useReviewQueue()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[264px] gap-0 rounded-none border-r border-border bg-surface p-0 sm:max-w-[264px]"
      >
        <div className="flex h-[52px] flex-none items-center gap-2.5 border-b border-border px-4">
          <SvertoMark className="size-[19px]" />
          <SheetTitle className="text-[13.5px] leading-none font-semibold tracking-[-0.01em] text-ink">
            Sverto
          </SheetTitle>
        </div>
        <nav aria-label="Primary" className="flex flex-col p-2">
          {MENU_NAV.map((destination) => {
            const active = isDestinationActive(destination, pathname)
            const Icon = destination.icon
            const badged = destination.badge === "review"
            return (
              <Link
                key={destination.id}
                {...destination.link}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                aria-label={
                  badged
                    ? navBadgeLabel(
                        destination.title,
                        review.count,
                        review.mockId !== null,
                        review.isLowerBound
                      )
                    : undefined
                }
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-sm px-2.5 text-[13px] leading-none font-medium transition-colors duration-instant ease-out-quick",
                  focusRing.sm,
                  active
                    ? "bg-brand-dim text-brand"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                )}
              >
                <span className="relative flex size-4 flex-none items-center justify-center">
                  <Icon className="size-4" strokeWidth={1.8} aria-hidden />
                  {badged ? (
                    <NavBadge
                      count={review.count}
                      mockId={review.mockId}
                      isLowerBound={review.isLowerBound}
                    />
                  ) : null}
                </span>
                {destination.title}
                {badged && review.mockId !== null && review.count > 0 ? (
                  <MockBadge id={review.mockId} className="ml-auto" />
                ) : null}
              </Link>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
