import { Link } from "@tanstack/react-router"

import { useAuthMe, useUserId } from "@/auth"
import { env } from "@/lib/env"
import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives"
import { useAccountConnectors } from "@/features/accounts/api"

import type { SettingsSection } from "./nav"
import { SETTINGS_SECTION_LIST } from "./nav"

function useSectionBadges(): Partial<Record<SettingsSection, number>> {
  const connectors = useAccountConnectors(useUserId())
  const needsAttention = connectors.data?.needsAttentionCount ?? 0
  return needsAttention > 0 ? { connections: needsAttention } : {}
}

function RailBadge({ count }: { count: number }) {
  return (
    <span
      data-figure=""
      className="flex-none rounded-full bg-attention px-1.5 py-[3px] font-mono text-[9.5px] leading-none font-bold text-on-brand tabular-nums"
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}

function RailIdentity() {
  const me = useAuthMe(true)
  const username = me.data?.user_metadata?.username ?? null
  const deployment =
    env.authProvider === "noauth" ? "authentication disabled" : env.authProvider

  return (
    <div className="mt-[14px] hidden border-t border-border px-[10px] py-[11px] lg:block">
      <p className="text-[12px] leading-[1.3] font-medium">
        {username ?? "Signed in"}
      </p>
      <p className="text-[11px] leading-[1.5] text-ink-3">
        {me.data?.role ?? "—"} · {deployment}
      </p>
    </div>
  )
}

export function SettingsSectionRail({ section }: { section: SettingsSection }) {
  const badges = useSectionBadges()

  return (
    <nav
      data-slot="settings-rail"
      aria-label="Settings sections"
      className={cn(
        "flex min-w-0 shrink-0 flex-wrap gap-[3px] pb-3",
        "lg:w-[212px] lg:flex-col lg:flex-nowrap lg:border-r lg:border-border lg:pr-[14px] lg:pb-[26px]"
      )}
    >
      <span className="hidden px-[10px] pb-[14px] text-[10px] leading-none font-semibold tracking-[0.14em] text-ink-3 uppercase lg:block">
        Settings
      </span>
      {SETTINGS_SECTION_LIST.map((entry) => {
        const active = entry.id === section
        const badge = badges[entry.id]
        return (
          <Link
            key={entry.id}
            to="/settings"
            search={{ section: entry.id }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-none items-center gap-[9px] rounded-button px-[10px] py-[9px] text-[12.5px] leading-none whitespace-nowrap transition-colors duration-instant ease-out-quick lg:flex-auto",
              focusRing.button,
              active
                ? "bg-brand-dim font-semibold text-brand"
                : "font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
            )}
          >
            {entry.label}
            <span className="hidden flex-1 lg:block" />
            {badge === undefined ? null : <RailBadge count={badge} />}
          </Link>
        )
      })}
      <span className="hidden flex-1 lg:block" />
      <RailIdentity />
    </nav>
  )
}
