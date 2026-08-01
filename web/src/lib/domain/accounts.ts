/**
 * EDITORIAL TAXONOMY — NOT A SERVER CONCEPT.
 *
 * The backend has no account class, no is-liability flag and exactly one seeded
 * `account_liquidity_type` ("Liquid"), so neither the four asset-class groups nor
 * the "liquid today" figure can come from the API.
 * This module is the single source of truth for that mapping. Change it here and
 * every screen changes with it; never re-derive a class in a screen.
 */

export type AccountClass =
  "cash" | "investments" | "property" | "other" | "liabilities"

export const ACCOUNT_CLASS_ORDER = [
  "cash",
  "investments",
  "property",
  "other",
  "liabilities",
] as const satisfies readonly AccountClass[]

export const ACCOUNT_CLASS_LABELS: Record<AccountClass, string> = {
  cash: "Cash",
  investments: "Investments",
  property: "Property",
  other: "Other",
  liabilities: "Liabilities",
}

/**
 * Where an account type we have never seen lands. The eleven seeded types all map
 * to one of the four designed groups; "other" only ever appears if the backend
 * adds a twelfth, which is exactly when a visible group beats a silent guess.
 */
export const UNCLASSIFIED_ACCOUNT_CLASS: AccountClass = "other"

export interface AccountTypeRef {
  id: number
  name?: string | null
}

export interface AccountTypeTaxonomy {
  id: number
  name: string
  accountClass: AccountClass
  /** Spendable today. Deliberately independent of `accountClass` so the two can diverge. */
  liquid: boolean
}

/** `GET /api/accounts/types`, seeded by `20260328000000_seed_reference_data.sql:23-35`. */
export const SEEDED_ACCOUNT_TYPES: readonly AccountTypeTaxonomy[] = [
  { id: 1, name: "Current", accountClass: "cash", liquid: true },
  { id: 2, name: "Savings", accountClass: "cash", liquid: true },
  { id: 3, name: "Investment", accountClass: "investments", liquid: false },
  { id: 4, name: "Credit", accountClass: "liabilities", liquid: false },
  {
    id: 5,
    name: "Personal Pension",
    accountClass: "investments",
    liquid: false,
  },
  {
    id: 6,
    name: "Workplace Pension",
    accountClass: "investments",
    liquid: false,
  },
  { id: 7, name: "Mortgage", accountClass: "liabilities", liquid: false },
  { id: 8, name: "Loan", accountClass: "liabilities", liquid: false },
  { id: 9, name: "Real Estate", accountClass: "property", liquid: false },
  { id: 10, name: "Crypto Wallet", accountClass: "investments", liquid: false },
  { id: 11, name: "Cash", accountClass: "cash", liquid: true },
]

const BY_ID = new Map<number, AccountTypeTaxonomy>(
  SEEDED_ACCOUNT_TYPES.map((entry) => [entry.id, entry])
)

const BY_NAME = new Map<string, AccountTypeTaxonomy>(
  SEEDED_ACCOUNT_TYPES.map((entry) => [normaliseTypeName(entry.name), entry])
)

function normaliseTypeName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Name first so a re-seeded id cannot silently reclassify an account; id second so
 * a renamed type still resolves.
 */
export function accountTypeTaxonomy(
  type: AccountTypeRef | null | undefined
): AccountTypeTaxonomy | null {
  if (!type) return null
  if (type.name) {
    const byName = BY_NAME.get(normaliseTypeName(type.name))
    if (byName) return byName
  }
  return BY_ID.get(type.id) ?? null
}

export function isKnownAccountType(
  type: AccountTypeRef | null | undefined
): boolean {
  return accountTypeTaxonomy(type) !== null
}

export function classifyAccountType(
  type: AccountTypeRef | null | undefined
): AccountClass {
  return accountTypeTaxonomy(type)?.accountClass ?? UNCLASSIFIED_ACCOUNT_CLASS
}

export function isLiquidAccountType(
  type: AccountTypeRef | null | undefined
): boolean {
  return accountTypeTaxonomy(type)?.liquid ?? false
}

export function isLiabilityClass(accountClass: AccountClass): boolean {
  return accountClass === "liabilities"
}

export function isLiabilityAccountType(
  type: AccountTypeRef | null | undefined
): boolean {
  return isLiabilityClass(classifyAccountType(type))
}

export function accountClassRank(accountClass: AccountClass): number {
  const rank = ACCOUNT_CLASS_ORDER.indexOf(accountClass)
  return rank === -1 ? ACCOUNT_CLASS_ORDER.length : rank
}

export function compareAccountClasses(
  a: AccountClass,
  b: AccountClass
): number {
  return accountClassRank(a) - accountClassRank(b)
}

/** `account.ownership_share` is a fraction, `0 < share <= 1` (initial.sql:150,156). */
const FULL_OWNERSHIP_SHARE = 1

export function isJointAccount(ownershipShare: number): boolean {
  return (
    Number.isFinite(ownershipShare) && ownershipShare < FULL_OWNERSHIP_SHARE
  )
}

/** Feed to `<Figure kind="percent">`, which owns the rounding. */
export function ownershipSharePercent(ownershipShare: number): number {
  return ownershipShare * 100
}

export function applyOwnershipShare(
  value: number,
  ownershipShare: number
): number {
  return value * ownershipShare
}
