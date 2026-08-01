import { Link } from "@tanstack/react-router"

import type { MockId } from "@/lib/mock"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { focusRing } from "@/components/primitives/focus-ring"
import { HIT_TARGET } from "@/components/primitives/hit-target"

import { NavBadge } from "./nav-badge"
import {
  isDestinationActive,
  MYRA_NAV,
  navBadgeLabel,
  RAIL_NAV,
  type NavDestination,
} from "./navigation"
import { ProfileMenu } from "./profile-menu"
import { useReviewQueue } from "./review-queue"
import { SvertoMark } from "./sverto-mark"

const RAIL_ITEM =
  "relative flex size-[34px] items-center justify-center rounded-panel transition-colors duration-instant ease-out-quick after:absolute after:-inset-[5px] after:content-['']"

function RailItem({
  destination,
  pathname,
  badgeCount,
  badgeMockId,
  badgeIsLowerBound,
  tinted = false,
}: {
  destination: NavDestination
  pathname: string
  badgeCount: number
  badgeMockId: MockId | null
  badgeIsLowerBound: boolean
  tinted?: boolean
}) {
  const active = isDestinationActive(destination, pathname)
  const Icon = destination.icon
  const badged = destination.badge === "review"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            {...destination.link}
            aria-label={
              badged
                ? navBadgeLabel(
                    destination.label,
                    badgeCount,
                    badgeMockId !== null,
                    badgeIsLowerBound
                  )
                : destination.label
            }
            aria-current={active ? "page" : undefined}
            className={cn(
              RAIL_ITEM,
              focusRing.panel,
              active && "bg-brand-dim text-brand",
              !active && tinted && "text-brand",
              !active && !tinted && "text-ink-3 hover:text-ink-2"
            )}
          />
        }
      >
        <Icon className="size-4" strokeWidth={1.8} aria-hidden />
        {badged ? (
          <NavBadge
            count={badgeCount}
            mockId={badgeMockId}
            isLowerBound={badgeIsLowerBound}
          />
        ) : null}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {destination.label}
      </TooltipContent>
    </Tooltip>
  )
}

export function IconRail({ pathname }: { pathname: string }) {
  const review = useReviewQueue()

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 flex h-svh w-[58px] flex-none flex-col items-center gap-1.5 border-r border-border py-4"
    >
      <Link
        to="/"
        aria-label="Sverto home"
        className={cn("mb-3.5 flex-none", HIT_TARGET, focusRing.sm)}
      >
        <SvertoMark className="size-[23px]" />
      </Link>

      {RAIL_NAV.map((destination) => (
        <RailItem
          key={destination.id}
          destination={destination}
          pathname={pathname}
          badgeCount={review.count}
          badgeMockId={review.mockId}
          badgeIsLowerBound={review.isLowerBound}
        />
      ))}

      <div className="flex-1" />

      <RailItem
        destination={MYRA_NAV}
        pathname={pathname}
        badgeCount={review.count}
        badgeMockId={review.mockId}
        badgeIsLowerBound={review.isLowerBound}
        tinted
      />

      <ProfileMenu />
    </nav>
  )
}
