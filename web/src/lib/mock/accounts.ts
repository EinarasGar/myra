export interface MockDeactivatedAccount {
  id: string
  name: string
  typeLabel: string
  deactivatedOn: string
}

export const MOCK_DEACTIVATED_ACCOUNTS: readonly MockDeactivatedAccount[] = [
  {
    id: "mock-deactivated-revolut",
    name: "Revolut Current",
    typeLabel: "Current",
    deactivatedOn: "2026-02-18",
  },
  {
    id: "mock-deactivated-vanguard",
    name: "Old Vanguard ISA",
    typeLabel: "Investment",
    deactivatedOn: "2025-11-02",
  },
]

export interface MockAccountMetadata {
  institution?: string
  interestRatePercent?: number
  interestRateNote?: string
  originalPrincipal?: number
  monthlyPayment?: number
  paymentDayOfMonth?: number
  termRemainingMonths?: number
  interestThisYear?: number
  interestPaymentsThisYear?: number
  creditLimit?: number
  paymentDueOn?: string
  valuedOn?: string
  reference?: string
}

const ACCOUNT_METADATA: Record<string, MockAccountMetadata> = {
  "halifax mortgage": {
    institution: "Halifax",
    interestRatePercent: 4.29,
    interestRateNote: "fixed to Mar 2029",
    originalPrincipal: 210000,
    monthlyPayment: 1616.8,
    paymentDayOfMonth: 8,
    termRemainingMonths: 268,
    interestThisYear: -2984.4,
    interestPaymentsThisYear: 7,
    reference: "HFX •••• 6620",
  },
  "amex credit card": {
    institution: "American Express",
    interestRatePercent: 24.9,
    interestRateNote: "variable APR",
    creditLimit: 6000,
    paymentDueOn: "2026-08-08",
  },
  "marcus savings": {
    institution: "Goldman Sachs",
    interestRatePercent: 4.5,
    interestRateNote: "variable, paid monthly",
  },
  "lloyds current": { institution: "Lloyds Bank" },
  "lloyds saver": { institution: "Lloyds Bank", interestRatePercent: 3.2 },
  "joint bills & cash": { institution: "Starling Bank" },
  "trading 212 isa": { institution: "Trading 212" },
  "interactive brokers": { institution: "Interactive Brokers" },
  coinbase: { institution: "Coinbase" },
  "ledger cold wallet": { institution: "self-custody" },
  "aviva workplace pension": { institution: "Aviva" },
  "cash wallet": {},
  "home — 14 bishopsgate": { valuedOn: "2026-07-01" },
  "grandfather's watch": { valuedOn: "2026-04-12" },
}

export function mockAccountMetadata(
  accountName: string
): MockAccountMetadata | null {
  const key = accountName.trim().toLowerCase().replace(/\s+/g, " ")
  return ACCOUNT_METADATA[key] ?? null
}

export const MOCK_ACCOUNT_METADATA_NAMES: readonly string[] =
  Object.keys(ACCOUNT_METADATA)
