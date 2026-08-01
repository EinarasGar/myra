import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives/focus-ring"

import { NavBadge } from "./nav-badge"
import { isDestinationActive, navBadgeLabel, TAB_NAV } from "./navigation"
import { useReviewQueue } from "./review-queue"

export function BottomTabBar({ pathname }: { pathname: string }) {
  const review = useReviewQueue()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      {TAB_NAV.map((destination) => {
        const active = isDestinationActive(destination, pathname)
        const Icon = destination.icon
        const badged = destination.badge === "review"
        return (
          <Link
            key={destination.id}
            {...destination.link}
            aria-current={active ? "page" : undefined}
            aria-label={
              badged
                ? navBadgeLabel(
                    destination.label,
                    review.count,
                    review.mockId !== null,
                    review.isLowerBound
                  )
                : undefined
            }
            className={cn(
              "relative flex h-14 flex-1 flex-col items-center justify-center gap-[5px] transition-colors duration-instant ease-out-quick",
              focusRing.row,
              active ? "text-brand" : "text-ink-3"
            )}
          >
            <Icon className="size-[15px]" strokeWidth={1.8} aria-hidden />
            <span className="text-[9.5px] leading-none font-medium">
              {destination.label}
            </span>
            {badged ? (
              <NavBadge
                count={review.count}
                mockId={review.mockId}
                isLowerBound={review.isLowerBound}
                placement="tab"
              />
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
