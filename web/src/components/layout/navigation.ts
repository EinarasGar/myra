import type { LinkProps } from "@tanstack/react-router"
import {
  AlignLeft,
  Check,
  CreditCard,
  House,
  Settings,
  Sparkle,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

export type NavId =
  | "dashboard"
  | "transactions"
  | "review"
  | "portfolio"
  | "accounts"
  | "myra"
  | "settings"

export type NavBadgeKind = "review"

export interface NavDestination {
  id: NavId
  label: string
  title: string
  eyebrow: string
  description: string
  icon: LucideIcon
  link: LinkProps
  match: string
  exact?: boolean
  badge?: NavBadgeKind
}

const DASHBOARD: NavDestination = {
  id: "dashboard",
  label: "Home",
  title: "Dashboard",
  eyebrow: "Overview",
  description: "Net worth, what needs you, accounts and investments",
  icon: House,
  link: { to: "/" },
  match: "/",
  exact: true,
}

const TRANSACTIONS: NavDestination = {
  id: "transactions",
  label: "Ledger",
  title: "Transactions",
  eyebrow: "Ledger",
  description: "Explore every transaction, group it, slice it",
  icon: AlignLeft,
  link: { to: "/transactions" },
  match: "/transactions",
  badge: "review",
}

const REVIEW: NavDestination = {
  id: "review",
  label: "Review",
  title: "Review",
  eyebrow: "Ledger",
  description: "One queue for proposals, imports and receipts",
  icon: Check,
  link: { to: "/transactions", search: { mode: "review" } },
  match: "/transactions",
  badge: "review",
}

const PORTFOLIO: NavDestination = {
  id: "portfolio",
  label: "Portfolio",
  title: "Portfolio",
  eyebrow: "Investments",
  description: "Holdings, lots, allocation and what moved",
  icon: TrendingUp,
  link: { to: "/portfolio" },
  match: "/portfolio",
}

const ACCOUNTS: NavDestination = {
  id: "accounts",
  label: "Accounts",
  title: "Accounts",
  eyebrow: "Money",
  description: "Cash, investments, property and liabilities",
  icon: CreditCard,
  link: { to: "/accounts" },
  match: "/accounts",
}

const MYRA: NavDestination = {
  id: "myra",
  label: "Myra",
  title: "Myra",
  eyebrow: "Assistant",
  description: "Ask about your money; Myra proposes, you decide",
  icon: Sparkle,
  link: { to: "/ai-chat" },
  match: "/ai-chat",
}

const SETTINGS: NavDestination = {
  id: "settings",
  label: "Settings",
  title: "Settings",
  eyebrow: "Settings",
  description: "Categories, accounts, base currency, connections",
  icon: Settings,
  link: { to: "/settings" },
  match: "/settings",
}

export const RAIL_NAV: readonly NavDestination[] = [
  DASHBOARD,
  TRANSACTIONS,
  PORTFOLIO,
  ACCOUNTS,
]

export const TAB_NAV: readonly NavDestination[] = [
  DASHBOARD,
  TRANSACTIONS,
  REVIEW,
  PORTFOLIO,
  MYRA,
]

export const MENU_NAV: readonly NavDestination[] = [
  DASHBOARD,
  TRANSACTIONS,
  PORTFOLIO,
  ACCOUNTS,
  MYRA,
  SETTINGS,
]

export const MYRA_NAV = MYRA

export const SETTINGS_NAV = SETTINGS

export const DESTINATIONS: readonly NavDestination[] = [
  DASHBOARD,
  TRANSACTIONS,
  REVIEW,
  PORTFOLIO,
  ACCOUNTS,
  MYRA,
  SETTINGS,
]

export function navBadgeLabel(
  label: string,
  count: number,
  mocked: boolean,
  isLowerBound = false
): string {
  if (count <= 0) return label
  const noun = count === 1 ? "item needs" : "items need"
  const quantity = isLowerBound ? `at least ${count}` : String(count)
  return `${label}, ${quantity} ${noun} review${mocked ? " (example data)" : ""}`
}

export function isDestinationActive(
  destination: NavDestination,
  pathname: string
): boolean {
  if (destination.exact === true) return pathname === destination.match
  return (
    pathname === destination.match ||
    pathname.startsWith(`${destination.match}/`)
  )
}

export function destinationFor(pathname: string): NavDestination | undefined {
  const matches = DESTINATIONS.filter(
    (destination) =>
      destination.id !== "review" && isDestinationActive(destination, pathname)
  )
  return matches.reduce<NavDestination | undefined>(
    (best, candidate) =>
      best === undefined || candidate.match.length > best.match.length
        ? candidate
        : best,
    undefined
  )
}

export const APP_NAME = "Sverto"

export function titleForPathname(pathname: string): string {
  const destination = destinationFor(pathname)
  if (!destination) return APP_NAME
  return `${destination.title} · ${APP_NAME}`
}
