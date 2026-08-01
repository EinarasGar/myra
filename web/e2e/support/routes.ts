export interface AppRoute {
  readonly name: string
  readonly path: string
  readonly ready: string
}

const PAGE_HEADER = '[data-slot="page-header"]'

export const DASHBOARD: AppRoute = {
  name: "dashboard",
  path: "/",
  ready: '[data-slot="dashboard"]',
}

export const LEDGER: AppRoute = {
  name: "ledger",
  path: "/transactions",
  ready: PAGE_HEADER,
}

export const REVIEW: AppRoute = {
  name: "review",
  path: "/transactions?mode=review",
  ready: PAGE_HEADER,
}

export const PORTFOLIO: AppRoute = {
  name: "portfolio",
  path: "/portfolio",
  ready: PAGE_HEADER,
}

export const ACCOUNTS: AppRoute = {
  name: "accounts",
  path: "/accounts",
  ready: PAGE_HEADER,
}

export const MYRA: AppRoute = {
  name: "myra",
  path: "/ai-chat",
  ready: PAGE_HEADER,
}

export const SETTINGS: AppRoute = {
  name: "settings/general",
  path: "/settings",
  ready: PAGE_HEADER,
}

export const STATIC_ROUTES: readonly AppRoute[] = [
  DASHBOARD,
  LEDGER,
  REVIEW,
  PORTFOLIO,
  ACCOUNTS,
  MYRA,
  SETTINGS,
  {
    name: "settings/categories",
    path: "/settings?section=categories",
    ready: PAGE_HEADER,
  },
  {
    name: "settings/connections",
    path: "/settings?section=connections",
    ready: PAGE_HEADER,
  },
  { name: "settings/myra", path: "/settings?section=myra", ready: PAGE_HEADER },
  {
    name: "not-found",
    path: "/no-such-page",
    ready: '[data-slot="route-not-found"]',
  },
]

export function accountDetailRoute(accountId: string): AppRoute {
  return {
    name: "account detail",
    path: `/accounts/${accountId}`,
    ready: PAGE_HEADER,
  }
}

export function assetDetailRoute(assetId: number): AppRoute {
  return {
    name: "asset detail",
    path: `/portfolio/${String(assetId)}`,
    ready: PAGE_HEADER,
  }
}
