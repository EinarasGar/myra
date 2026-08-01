import { use, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { AuthSessionContext } from "@/auth"
import { accountsQueryOptions } from "@/features/accounts/api"
import type { SettingsSection } from "@/features/settings"
import { SETTINGS_SECTION_LIST } from "@/features/settings"

export interface PaletteItem {
  id: string
  title: string
  meta?: string
  glyph?: ReactNode
  keywords?: readonly string[]
  value?: ReactNode
  keyHint?: string
  onSelect: () => void
}

export interface PaletteSection {
  id: string
  label: string
  items: readonly PaletteItem[]
}

export function matchesQuery(
  query: string,
  haystack: readonly (string | undefined)[]
): boolean {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) return true
  const terms = needle.split(/\s+/)
  const text = haystack
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase()
  return terms.every((term) => text.includes(term))
}

const ACCOUNTS_SHOWN = 6

export interface PaletteJump {
  toAccount: (accountId: string) => void
  toSettingsSection: (section: SettingsSection) => void
}

/**
 * The palette lives above the auth guard, so it reads the session rather than requiring
 * one, and fetches only while it is open: a shortcut nobody presses costs nothing.
 */
export function useAccountSection(
  query: string,
  open: boolean,
  jump: PaletteJump
): PaletteSection | null {
  const session = use(AuthSessionContext)
  const userId = session?.status === "authenticated" ? session.userId : null
  const accounts = useQuery({
    ...accountsQueryOptions(userId ?? ""),
    enabled: open && userId !== null,
  })
  const rows = accounts.data?.accounts

  return useMemo(() => {
    if (rows === undefined) return null
    const items = rows
      .filter((account) =>
        matchesQuery(query, [
          account.name,
          account.accountTypeName ?? undefined,
        ])
      )
      .slice(0, ACCOUNTS_SHOWN)
      .map<PaletteItem>((account) => ({
        id: `account:${account.accountId}`,
        title: account.name,
        ...(account.accountTypeName === null
          ? {}
          : { meta: account.accountTypeName }),
        glyph: "◦",
        onSelect: () => {
          jump.toAccount(account.accountId)
        },
      }))
    return { id: "accounts", label: "Accounts", items }
  }, [rows, query, jump])
}

export function useSettingsSection(
  query: string,
  jump: PaletteJump
): PaletteSection {
  return useMemo(
    () => ({
      id: "settings-sections",
      label: "Settings",
      items: SETTINGS_SECTION_LIST.filter((meta) =>
        matchesQuery(query, [meta.title, meta.intro, "settings"])
      ).map<PaletteItem>((meta) => ({
        id: `settings:${meta.id}`,
        title: `Settings · ${meta.title}`,
        glyph: "→",
        onSelect: () => {
          jump.toSettingsSection(meta.id)
        },
      })),
    }),
    [query, jump]
  )
}
