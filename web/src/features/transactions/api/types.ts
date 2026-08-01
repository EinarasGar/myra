import type {
  GroupTransactionItem,
  RequiredIdentifiableTransaction,
  TransactionFeeType,
  TransactionVisibility,
} from "@/api"
import type { FigureIntent } from "@/components/figure"
import type { AccountRef, AssetRef, Category } from "@/lib/domain/refs"
import type {
  TransactionAmountKind,
  TransactionEntryPlacement,
  TransactionTypeTag,
} from "@/lib/domain/transaction-types"
import type { TransactionGroupId, TransactionId } from "@/lib/query"

export type { TransactionTypeTag }

const ASSET_UNITS = Symbol("nativeAmount.assetUnits")

/**
 * A quantity of one asset, as the ledger stores it. Nothing converts a transaction into
 * the user's base currency, so the number is held under a key no other module can name:
 * rendering goes through `nativeFigureProps`, and reading the bare number means calling
 * `assetUnitsOf` and owning what that means.
 */
export interface NativeAmount {
  readonly [ASSET_UNITS]: number
  readonly asset: AssetRef
}

export function nativeAmount(units: number, asset: AssetRef): NativeAmount {
  return { [ASSET_UNITS]: units, asset }
}

export function assetUnitsOf(amount: NativeAmount): number {
  return amount[ASSET_UNITS]
}

export interface BaseCurrencyAmountUnavailable {
  readonly available: false
  readonly reason: "no-transaction-level-conversion"
  readonly gap: "D1"
}

export const BASE_CURRENCY_AMOUNT_UNAVAILABLE: BaseCurrencyAmountUnavailable = {
  available: false,
  reason: "no-transaction-level-conversion",
  gap: "D1",
}

export type LegRole = "primary" | "counter"

export type LegDirection = "in" | "out" | "flat"

export interface LedgerLeg {
  readonly entryId: number
  readonly role: LegRole
  readonly direction: LegDirection
  readonly placement: TransactionEntryPlacement
  readonly amountKind: TransactionAmountKind
  readonly label: string
  readonly account: AccountRef
  readonly amount: NativeAmount
}

export interface LedgerFee {
  readonly entryId: number
  readonly feeType: TransactionFeeType
  readonly account: AccountRef
  readonly amount: NativeAmount
}

export interface LedgerDescription {
  readonly primary: string
  readonly detail: string | null
  readonly source: "api" | "synthesised"
}

export interface LedgerTransactionRow {
  readonly kind: "transaction"
  readonly rowId: string
  readonly transactionId: TransactionId
  readonly groupId: TransactionGroupId | null
  readonly type: TransactionTypeTag
  readonly typeName: string
  readonly date: Date
  readonly visibility: TransactionVisibility
  readonly isUnreviewed: boolean
  readonly isHidden: boolean
  readonly description: LedgerDescription
  readonly category: Category | null
  readonly categorySupported: boolean
  readonly account: AccountRef | null
  readonly accounts: readonly AccountRef[]
  readonly legs: readonly LedgerLeg[]
  readonly primaryLeg: LedgerLeg | null
  readonly primaryAmount: NativeAmount | null
  readonly figureIntent: FigureIntent
  readonly fees: readonly LedgerFee[]
  readonly baseCurrencyAmount: BaseCurrencyAmountUnavailable
  readonly raw: RequiredIdentifiableTransaction
}

export interface LedgerGroupRow {
  readonly kind: "group"
  readonly rowId: string
  readonly groupId: TransactionGroupId
  readonly date: Date
  readonly description: LedgerDescription
  readonly category: Category | null
  readonly categorySupported: true
  readonly accounts: readonly AccountRef[]
  readonly children: readonly LedgerTransactionRow[]
  readonly childCount: number
  readonly amountsByAsset: readonly NativeAmount[]
  readonly isUnreviewed: boolean
  readonly figureIntent: FigureIntent
  readonly baseCurrencyAmount: BaseCurrencyAmountUnavailable
  readonly raw: GroupTransactionItem
}

export type LedgerRow = LedgerTransactionRow | LedgerGroupRow

export interface LedgerDay {
  readonly key: string
  readonly date: Date
  readonly rows: readonly LedgerRow[]
  readonly netByCurrency: readonly NativeAmount[]
}

export function isTransactionRow(row: LedgerRow): row is LedgerTransactionRow {
  return row.kind === "transaction"
}

export function isGroupRow(row: LedgerRow): row is LedgerGroupRow {
  return row.kind === "group"
}
