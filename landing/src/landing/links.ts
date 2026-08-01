export const LANDING_SOURCE_URL = "https://github.com/EinarasGar/myra"
export const LANDING_LICENCE_URL =
  "https://github.com/EinarasGar/myra/blob/main/LICENSE"

export interface LandingLink {
  readonly label: string
  /** An in-page anchor, an absolute URL, or null when the destination does not exist yet. */
  readonly target: string | null
}

export interface LandingNavItem {
  readonly label: string
  readonly target: string
}

export const LANDING_NAV: readonly LandingNavItem[] = [
  { label: "How it works", target: "#how-it-works" },
  { label: "Investing", target: "#investing" },
  { label: "Myra", target: "#myra" },
  { label: "Self-hosting", target: "#self-hosting" },
  { label: "Pricing", target: "#pricing" },
  { label: "Docs", target: LANDING_SOURCE_URL },
]

export interface LandingFooterGroup {
  readonly title: string
  readonly links: readonly LandingLink[]
}

export const LANDING_FOOTER_GROUPS: readonly LandingFooterGroup[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", target: "#how-it-works" },
      { label: "Investing", target: "#investing" },
      { label: "Myra", target: "#myra" },
      { label: "Pricing", target: "#pricing" },
      { label: "Demo ledger", target: null },
    ],
  },
  {
    title: "Open source",
    links: [
      { label: "GitHub", target: LANDING_SOURCE_URL },
      { label: "Self-hosting guide", target: null },
      { label: "AGPL-3.0 licence", target: LANDING_LICENCE_URL },
      { label: "Roadmap", target: null },
      { label: "Changelog", target: null },
    ],
  },
  {
    title: "More",
    links: [
      { label: "Docs", target: LANDING_SOURCE_URL },
      { label: "API reference", target: null },
      { label: "Status", target: null },
      { label: "Contact", target: null },
      { label: "Privacy", target: null },
    ],
  },
]

export function isExternalTarget(target: string): boolean {
  return target.startsWith("http")
}
