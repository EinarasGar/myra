export const PROVIDER_KINDS = ["truelayer", "trading212"] as const

export type ProviderKind = (typeof PROVIDER_KINDS)[number]

export type ProviderCredential = "oauth" | "apiKey"

export interface ProviderCatalogueEntry {
  readonly kind: ProviderKind
  readonly mark: string
  readonly name: string
  readonly tagline: string
  readonly description: string
  readonly connectLabel: string
  readonly credential: ProviderCredential
}

/**
 * No endpoint lists available providers with display metadata — the two kinds are
 * seeded strings on the server — so the catalogue is owned here.
 */
export const PROVIDER_CATALOGUE: readonly ProviderCatalogueEntry[] = [
  {
    kind: "truelayer",
    mark: "TL",
    name: "TrueLayer",
    tagline: "Bank accounts via Open Banking",
    description:
      "Connect your banks through Open Banking. Sverto imports balances and transaction history and keeps them up to date. Read-only — no payment access is ever requested.",
    connectLabel: "Connect a bank",
    credential: "oauth",
  },
  {
    kind: "trading212",
    mark: "T2",
    name: "Trading 212",
    tagline: "Investment account history",
    description:
      "Import orders, dividends and cash movements from your investment account.",
    connectLabel: "Add an API key",
    credential: "apiKey",
  },
]

export function isProviderKind(value: string): value is ProviderKind {
  return (PROVIDER_KINDS as readonly string[]).includes(value)
}

export function providerEntry(
  kind: string
): ProviderCatalogueEntry | undefined {
  return PROVIDER_CATALOGUE.find((entry) => entry.kind === kind)
}

export function providerName(kind: string): string {
  return providerEntry(kind)?.name ?? kind
}

export function providerMark(kind: string): string {
  return providerEntry(kind)?.mark ?? kind.slice(0, 2).toUpperCase()
}
