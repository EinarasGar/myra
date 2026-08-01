import { Link, useNavigate } from "@tanstack/react-router"

import { useAuth, useAuthMe } from "@/auth"
import { env } from "@/lib/env"
import { EM_DASH } from "@/lib/format"
import { areMockMarkersVisible, mockMarkerProps } from "@/lib/mock"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SegmentedControl, Truncate } from "@/components/primitives"
import { focusRing } from "@/components/primitives/focus-ring"
import { useTheme } from "@/components/theme-provider"
import { ProfileUsageSummary } from "@/features/settings"

import { initialsFor } from "./identity"
import { navBadgeLabel, SETTINGS_NAV } from "./navigation"
import { useReviewQueue } from "./review-queue"

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const

const SECTION = "border-b border-border px-[15px] py-[13px]"

const SECTION_LABEL =
  "text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase"

export function ProfileMenu({
  size = "rail",
  className,
}: {
  size?: "rail" | "compact"
  className?: string
}) {
  const { isAuthenticated, signOut } = useAuth()
  const me = useAuthMe(isAuthenticated)
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const review = useReviewQueue()

  const username = me.data?.user_metadata?.username ?? null
  const initials = initialsFor(username)
  const baseCurrency = me.data?.default_asset?.ticker ?? EM_DASH
  const canSignOut = env.authProvider !== "noauth"
  const needsYou = size === "compact" && review.count > 0
  const markedMock = review.mockId !== null && areMockMarkersVisible()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={navBadgeLabel(
          "Account menu",
          needsYou ? review.count : 0,
          review.mockId !== null,
          review.isLowerBound
        )}
        className={cn(
          "relative flex-none rounded-button border border-border bg-surface-2 text-center font-semibold text-ink-2 transition-colors duration-instant ease-out-quick after:absolute after:-inset-2 after:content-['']",
          "aria-expanded:border-brand aria-expanded:bg-brand-dim aria-expanded:text-brand",
          focusRing.button,
          size === "rail"
            ? "size-[27px] text-[10px] leading-[25px]"
            : "size-[26px] text-[9.5px] leading-[24px]",
          className
        )}
      >
        {initials}
        {needsYou ? (
          <span
            aria-hidden
            {...mockMarkerProps(review.mockId)}
            className={cn(
              "absolute -top-[3px] -right-[3px] size-2 rounded-full ring-2 ring-background",
              markedMock
                ? "border border-dashed border-attention bg-attention-dim"
                : "bg-attention"
            )}
          />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={size === "rail" ? "right" : "bottom"}
        sideOffset={10}
        className="w-[300px] rounded-sheet border border-border-strong bg-surface p-0 text-ink shadow-popover ring-0"
      >
        <div className="flex items-center gap-[11px] border-b border-border px-[15px] pt-[14px] pb-[13px]">
          <span className="flex size-[34px] flex-none items-center justify-center rounded-panel border border-brand bg-brand-dim text-[11.5px] leading-none font-semibold text-brand">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <Truncate
              text={username ?? "Signed in"}
              className="block text-[13px] leading-[1.3] font-semibold"
            />
          </span>
          {me.data?.role ? (
            <span className="flex-none rounded-chip border border-border-strong px-[5px] py-1 text-[9px] leading-none font-semibold tracking-[0.06em] text-ink-3 uppercase">
              {me.data.role}
            </span>
          ) : null}
        </div>

        <div className={SECTION}>
          <span className={SECTION_LABEL}>Theme</span>
          <SegmentedControl
            label="Theme"
            className="mt-[9px]"
            value={theme}
            onValueChange={setTheme}
            options={THEME_OPTIONS}
          />
        </div>

        <ProfileUsageSummary />

        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-[10px] border-b border-border px-[15px] py-3",
            focusRing.row
          )}
        >
          <span className="text-[12px] leading-none font-medium text-ink-2">
            Base currency
          </span>
          <span className="flex-1" />
          <span
            data-figure
            className="font-mono text-[12px] leading-none font-semibold whitespace-nowrap"
          >
            {baseCurrency}
          </span>
        </Link>

        <div className="p-1.5">
          <Link
            {...SETTINGS_NAV.link}
            className={cn(
              "flex items-center gap-[10px] rounded-sm px-[9px] py-[9px] text-[12.5px] leading-none font-medium text-ink transition-colors duration-instant ease-out-quick hover:bg-surface-2",
              focusRing.sm
            )}
          >
            Settings
            <span className="flex-1" />
            <span className="font-mono text-[10px] leading-none text-ink-3">
              ⌘,
            </span>
          </Link>
          <Link
            to="/settings"
            search={{ section: "connections" }}
            className={cn(
              "flex items-center gap-[10px] rounded-sm px-[9px] py-[9px] text-[12.5px] leading-none font-medium text-ink transition-colors duration-instant ease-out-quick hover:bg-surface-2",
              focusRing.sm
            )}
          >
            Connections
          </Link>
        </div>

        {canSignOut ? (
          <div className="flex items-center border-t border-border bg-surface-2 px-[15px] py-[11px]">
            <Button
              variant="ghost"
              className="h-auto px-0 text-[12px] leading-none font-semibold text-negative hover:bg-transparent hover:text-negative"
              onClick={() => {
                void signOut().then(() => navigate({ to: "/login" }))
              }}
            >
              Sign out
            </Button>
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
