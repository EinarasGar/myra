import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  Coins,
  Gift,
  HandCoins,
  PackageMinus,
  PackagePlus,
  Percent,
  Receipt,
  Replace,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react"
import { z } from "zod"

import type { TransactionEntry, TransactionInput } from "@/api"
import type { FigureIntent } from "@/components/figure"

export type TransactionTypeTag = TransactionInput["type"]

type WireInput<T extends TransactionTypeTag> = Extract<
  TransactionInput,
  { type: T }
>

export type TransactionEntryField<T extends TransactionTypeTag> = {
  [K in keyof WireInput<T>]-?: NonNullable<
    WireInput<T>[K]
  > extends TransactionEntry
    ? K
    : never
}[keyof WireInput<T>]

export type TransactionEntrySign = "positive" | "negative" | "nonZero"

export type TransactionEntryPlacement = "single" | "incoming" | "outgoing"

export type TransactionAmountKind = "cash" | "units"

type TransactionDirection = "incoming" | "outgoing" | "both" | "internal"

type TransactionCashFlow = "inflow" | "outflow" | "signed" | "none"

type TransactionTypeGroupId = "everyday" | "transfers" | "investments"

export type TransactionRuleKind =
  "sameAccount" | "differentAccounts" | "sameAsset" | "equalMagnitude"

interface TransactionEntrySlot<T extends TransactionTypeTag> {
  field: TransactionEntryField<T>
  placement: TransactionEntryPlacement
  sign: TransactionEntrySign
  amountKind: TransactionAmountKind
  label: string
  accountLabel: string
}

interface TransactionCrossFieldRule<T extends TransactionTypeTag> {
  kind: TransactionRuleKind
  fields: readonly [TransactionEntryField<T>, TransactionEntryField<T>]
}

interface TransactionTypeFields {
  accounts: 1 | 2
  category: boolean
  description: boolean
  asset: boolean
  units: boolean
  unitPrice: boolean
  fees: boolean
  originAsset: boolean
}

export interface TransactionTypeConfig<T extends TransactionTypeTag> {
  type: T
  name: string
  chooserName: string
  description: string
  group: TransactionTypeGroupId
  icon: LucideIcon
  entries: readonly TransactionEntrySlot<T>[]
  primaryEntry: TransactionEntryField<T>
  fields: TransactionTypeFields
  direction: TransactionDirection
  cashFlow: TransactionCashFlow
  figureIntent: FigureIntent
  rules: readonly TransactionCrossFieldRule<T>[]
}

export type AnyTransactionTypeConfig = {
  [T in TransactionTypeTag]: TransactionTypeConfig<T>
}[TransactionTypeTag]

const NO_RULES = [] as const

export const TRANSACTION_TYPE_CONFIG: {
  [T in TransactionTypeTag]: TransactionTypeConfig<T>
} = {
  regular: {
    type: "regular",
    name: "Purchase",
    chooserName: "Purchase",
    description: "Everyday money in or out of one account.",
    group: "everyday",
    icon: Receipt,
    entries: [
      {
        field: "entry",
        placement: "single",
        sign: "nonZero",
        amountKind: "cash",
        label: "Amount",
        accountLabel: "Account",
      },
    ],
    primaryEntry: "entry",
    fields: {
      accounts: 1,
      category: true,
      description: true,
      asset: false,
      units: false,
      unitPrice: false,
      fees: true,
      originAsset: false,
    },
    direction: "both",
    cashFlow: "signed",
    figureIntent: "spending",
    rules: NO_RULES,
  },

  account_fees: {
    type: "account_fees",
    name: "Account fee",
    chooserName: "Account fee",
    description: "A service, platform or maintenance charge.",
    group: "everyday",
    icon: Percent,
    entries: [
      {
        field: "entry",
        placement: "outgoing",
        sign: "negative",
        amountKind: "cash",
        label: "Fee",
        accountLabel: "Account charged",
      },
    ],
    primaryEntry: "entry",
    fields: {
      accounts: 1,
      category: false,
      description: false,
      asset: false,
      units: false,
      unitPrice: false,
      fees: true,
      originAsset: false,
    },
    direction: "outgoing",
    cashFlow: "outflow",
    figureIntent: "spending",
    rules: NO_RULES,
  },

  cash_transfer_in: {
    type: "cash_transfer_in",
    name: "Cash in",
    chooserName: "Cash in",
    description:
      "Money arriving from outside Sverto — salary, a refund, a gift.",
    group: "transfers",
    icon: ArrowDownToLine,
    entries: [
      {
        field: "entry",
        placement: "incoming",
        sign: "positive",
        amountKind: "cash",
        label: "Amount in",
        accountLabel: "Account credited",
      },
    ],
    primaryEntry: "entry",
    fields: {
      accounts: 1,
      category: false,
      description: false,
      asset: false,
      units: false,
      unitPrice: false,
      fees: true,
      originAsset: false,
    },
    direction: "incoming",
    cashFlow: "inflow",
    figureIntent: "inflow",
    rules: NO_RULES,
  },

  cash_transfer_out: {
    type: "cash_transfer_out",
    name: "Cash out",
    chooserName: "Cash out",
    description: "Money leaving for somewhere Sverto does not track.",
    group: "transfers",
    icon: ArrowUpFromLine,
    entries: [
      {
        field: "entry",
        placement: "outgoing",
        sign: "negative",
        amountKind: "cash",
        label: "Amount out",
        accountLabel: "Account debited",
      },
    ],
    primaryEntry: "entry",
    fields: {
      accounts: 1,
      category: false,
      description: false,
      asset: false,
      units: false,
      unitPrice: false,
      fees: true,
      originAsset: false,
    },
    direction: "outgoing",
    cashFlow: "outflow",
    figureIntent: "spending",
    rules: NO_RULES,
  },

  cash_balance_transfer: {
    type: "cash_balance_transfer",
    name: "Cash balance transfer",
    chooserName: "Move cash",
    description: "Move the same currency between two of your accounts.",
    group: "transfers",
    icon: ArrowLeftRight,
    entries: [
      {
        field: "outgoing_change",
        placement: "outgoing",
        sign: "negative",
        amountKind: "cash",
        label: "From",
        accountLabel: "Account debited",
      },
      {
        field: "incoming_change",
        placement: "incoming",
        sign: "positive",
        amountKind: "cash",
        label: "To",
        accountLabel: "Account credited",
      },
    ],
    primaryEntry: "incoming_change",
    fields: {
      accounts: 2,
      category: false,
      description: false,
      asset: false,
      units: false,
      unitPrice: false,
      fees: true,
      originAsset: false,
    },
    direction: "internal",
    cashFlow: "none",
    figureIntent: "neutral",
    rules: [
      { kind: "sameAsset", fields: ["outgoing_change", "incoming_change"] },
      {
        kind: "equalMagnitude",
        fields: ["outgoing_change", "incoming_change"],
      },
      {
        kind: "differentAccounts",
        fields: ["outgoing_change", "incoming_change"],
      },
    ],
  },

  asset_transfer_in: {
    type: "asset_transfer_in",
    name: "Asset transfer in",
    chooserName: "Asset in",
    description: "Units of an asset arriving from outside Sverto.",
    group: "transfers",
    icon: PackagePlus,
    entries: [
      {
        field: "entry",
        placement: "incoming",
        sign: "positive",
        amountKind: "units",
        label: "Units in",
        accountLabel: "Account credited",
      },
    ],
    primaryEntry: "entry",
    fields: {
      accounts: 1,
      category: false,
      description: false,
      asset: true,
      units: true,
      unitPrice: false,
      fees: true,
      originAsset: false,
    },
    direction: "incoming",
    cashFlow: "none",
    figureIntent: "neutral",
    rules: NO_RULES,
  },

  asset_transfer_out: {
    type: "asset_transfer_out",
    name: "Asset transfer out",
    chooserName: "Asset out",
    description:
      "Units of an asset leaving for somewhere Sverto does not track.",
    group: "transfers",
    icon: PackageMinus,
    entries: [
      {
        field: "entry",
        placement: "outgoing",
        sign: "negative",
        amountKind: "units",
        label: "Units out",
        accountLabel: "Account debited",
      },
    ],
    primaryEntry: "entry",
    fields: {
      accounts: 1,
      category: false,
      description: false,
      asset: true,
      units: true,
      unitPrice: false,
      fees: true,
      originAsset: false,
    },
    direction: "outgoing",
    cashFlow: "none",
    figureIntent: "neutral",
    rules: NO_RULES,
  },

  asset_balance_transfer: {
    type: "asset_balance_transfer",
    name: "Asset balance transfer",
    chooserName: "Move an asset",
    description: "Move units of an asset between two of your accounts.",
    group: "transfers",
    icon: Boxes,
    entries: [
      {
        field: "outgoing_change",
        placement: "outgoing",
        sign: "negative",
        amountKind: "units",
        label: "From",
        accountLabel: "Account debited",
      },
      {
        field: "incoming_change",
        placement: "incoming",
        sign: "positive",
        amountKind: "units",
        label: "To",
        accountLabel: "Account credited",
      },
    ],
    primaryEntry: "incoming_change",
    fields: {
      accounts: 2,
      category: false,
      description: false,
      asset: true,
      units: true,
      unitPrice: false,
      fees: true,
      originAsset: false,
    },
    direction: "internal",
    cashFlow: "none",
    figureIntent: "neutral",
    rules: NO_RULES,
  },

  asset_purchase: {
    type: "asset_purchase",
    name: "Buy asset",
    chooserName: "Buy",
    description: "Spend cash on an asset inside one account.",
    group: "investments",
    icon: ShoppingCart,
    entries: [
      {
        field: "purchase_change",
        placement: "incoming",
        sign: "positive",
        amountKind: "units",
        label: "Units bought",
        accountLabel: "Account",
      },
      {
        field: "cash_outgoings_change",
        placement: "outgoing",
        sign: "negative",
        amountKind: "cash",
        label: "Cash paid",
        accountLabel: "Account",
      },
    ],
    primaryEntry: "cash_outgoings_change",
    fields: {
      accounts: 1,
      category: false,
      description: false,
      asset: true,
      units: true,
      unitPrice: true,
      fees: true,
      originAsset: false,
    },
    direction: "internal",
    cashFlow: "none",
    figureIntent: "neutral",
    rules: [
      {
        kind: "sameAccount",
        fields: ["purchase_change", "cash_outgoings_change"],
      },
    ],
  },

  asset_sale: {
    type: "asset_sale",
    name: "Sell asset",
    chooserName: "Sell",
    description: "Turn units of an asset back into cash inside one account.",
    group: "investments",
    icon: HandCoins,
    entries: [
      {
        field: "sale_entry",
        placement: "outgoing",
        sign: "negative",
        amountKind: "units",
        label: "Units sold",
        accountLabel: "Account",
      },
      {
        field: "proceeds_entry",
        placement: "incoming",
        sign: "positive",
        amountKind: "cash",
        label: "Cash received",
        accountLabel: "Account",
      },
    ],
    primaryEntry: "proceeds_entry",
    fields: {
      accounts: 1,
      category: false,
      description: false,
      asset: true,
      units: true,
      unitPrice: true,
      fees: true,
      originAsset: false,
    },
    direction: "internal",
    cashFlow: "none",
    figureIntent: "neutral",
    rules: [{ kind: "sameAccount", fields: ["sale_entry", "proceeds_entry"] }],
  },

  asset_trade: {
    type: "asset_trade",
    name: "Trade assets",
    chooserName: "Trade",
    description: "Swap one asset directly for another.",
    group: "investments",
    icon: Replace,
    entries: [
      {
        field: "outgoing_entry",
        placement: "outgoing",
        sign: "negative",
        amountKind: "units",
        label: "Units given",
        accountLabel: "Account debited",
      },
      {
        field: "incoming_entry",
        placement: "incoming",
        sign: "positive",
        amountKind: "units",
        label: "Units received",
        accountLabel: "Account credited",
      },
    ],
    primaryEntry: "incoming_entry",
    fields: {
      accounts: 2,
      category: false,
      description: false,
      asset: true,
      units: true,
      unitPrice: true,
      fees: true,
      originAsset: false,
    },
    direction: "internal",
    cashFlow: "none",
    figureIntent: "neutral",
    rules: NO_RULES,
  },

  cash_dividend: {
    type: "cash_dividend",
    name: "Cash dividend",
    chooserName: "Cash dividend",
    description: "Cash paid out by an asset you hold.",
    group: "investments",
    icon: Coins,
    entries: [
      {
        field: "entry",
        placement: "incoming",
        sign: "positive",
        amountKind: "cash",
        label: "Cash received",
        accountLabel: "Account credited",
      },
    ],
    primaryEntry: "entry",
    fields: {
      accounts: 1,
      category: false,
      description: false,
      asset: false,
      units: false,
      unitPrice: false,
      fees: true,
      originAsset: true,
    },
    direction: "incoming",
    cashFlow: "inflow",
    figureIntent: "inflow",
    rules: NO_RULES,
  },

  asset_dividend: {
    type: "asset_dividend",
    name: "Asset dividend",
    chooserName: "Asset dividend",
    description: "Extra units paid out by an asset you hold.",
    group: "investments",
    icon: Gift,
    entries: [
      {
        field: "entry",
        placement: "incoming",
        sign: "positive",
        amountKind: "units",
        label: "Units received",
        accountLabel: "Account credited",
      },
    ],
    primaryEntry: "entry",
    fields: {
      accounts: 1,
      category: false,
      description: false,
      asset: true,
      units: true,
      unitPrice: false,
      fees: true,
      originAsset: false,
    },
    direction: "incoming",
    cashFlow: "none",
    figureIntent: "inflow",
    rules: NO_RULES,
  },
}

export const TRANSACTION_TYPES: readonly TransactionTypeTag[] = [
  "regular",
  "account_fees",
  "cash_transfer_in",
  "cash_transfer_out",
  "cash_balance_transfer",
  "asset_transfer_in",
  "asset_transfer_out",
  "asset_balance_transfer",
  "asset_purchase",
  "asset_sale",
  "asset_trade",
  "cash_dividend",
  "asset_dividend",
]

const TRANSACTION_TYPE_GROUP_NAMES: Record<TransactionTypeGroupId, string> = {
  everyday: "Everyday",
  transfers: "Transfers",
  investments: "Investments",
}

const GROUP_ORDER: readonly TransactionTypeGroupId[] = [
  "everyday",
  "transfers",
  "investments",
]

export interface TransactionTypeGroup {
  id: TransactionTypeGroupId
  name: string
  types: readonly AnyTransactionTypeConfig[]
}

export const TRANSACTION_TYPE_GROUPS: readonly TransactionTypeGroup[] =
  GROUP_ORDER.map((id) => ({
    id,
    name: TRANSACTION_TYPE_GROUP_NAMES[id],
    types: TRANSACTION_TYPES.map(
      (type) => TRANSACTION_TYPE_CONFIG[type]
    ).filter((config) => config.group === id),
  }))

export function getTransactionTypeConfig<T extends TransactionTypeTag>(
  type: T
): TransactionTypeConfig<T> {
  return TRANSACTION_TYPE_CONFIG[type]
}

export function isTransactionTypeTag(
  value: unknown
): value is TransactionTypeTag {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(TRANSACTION_TYPE_CONFIG, value)
  )
}

export function transactionTypeName(type: TransactionTypeTag): string {
  return TRANSACTION_TYPE_CONFIG[type].name
}

export function transactionFigureIntent(
  type: TransactionTypeTag
): FigureIntent {
  return TRANSACTION_TYPE_CONFIG[type].figureIntent
}

export type TransactionFlowTone = "in" | "out" | "neutral"

export function transactionFlowTone(
  type: TransactionTypeTag,
  units: number | null
): TransactionFlowTone {
  switch (TRANSACTION_TYPE_CONFIG[type].direction) {
    case "incoming":
      return "in"
    case "outgoing":
      return "out"
    case "internal":
      return "neutral"
    default:
      if (units === null || units === 0) return "neutral"
      return units > 0 ? "in" : "out"
  }
}

export function isInternalTransfer(type: TransactionTypeTag): boolean {
  return TRANSACTION_TYPE_CONFIG[type].cashFlow === "none"
}

export function carriesCategory(type: TransactionTypeTag): boolean {
  return TRANSACTION_TYPE_CONFIG[type].fields.category
}

const POSITIVE_AMOUNT_MESSAGE = "Must be a positive value."
const NEGATIVE_AMOUNT_MESSAGE = "Must be a negative value."
export const NON_ZERO_AMOUNT_MESSAGE = "Must not be zero."

const DESCRIPTION_MAX_LENGTH = 500
const DESCRIPTION_LENGTH_MESSAGE = `Must be between 1 and ${DESCRIPTION_MAX_LENGTH} characters.`

const SIGN_MESSAGES: Record<TransactionEntrySign, string> = {
  positive: POSITIVE_AMOUNT_MESSAGE,
  negative: NEGATIVE_AMOUNT_MESSAGE,
  nonZero: NON_ZERO_AMOUNT_MESSAGE,
}

const RULE_PROPERTY: Record<
  TransactionRuleKind,
  "account_id" | "asset_id" | "amount"
> = {
  sameAccount: "account_id",
  differentAccounts: "account_id",
  sameAsset: "asset_id",
  equalMagnitude: "amount",
}

function ruleMessage(kind: TransactionRuleKind, a: string, b: string): string {
  const property = RULE_PROPERTY[kind]
  switch (kind) {
    case "sameAccount":
      return `${a}.${property} and ${b}.${property} must reference the same account.`
    case "differentAccounts":
      return `${a}.${property} and ${b}.${property} must reference different accounts.`
    case "sameAsset":
      return `${a}.${property} and ${b}.${property} must reference the same asset.`
    case "equalMagnitude":
      return `${a}.${property} and ${b}.${property} must have equal magnitude.`
  }
}

export interface TransactionFieldIssue {
  field: string
  message: string
}

type EntryDraft = Partial<TransactionEntry>

type TransactionDraft = Record<string, unknown>

function readEntry(draft: TransactionDraft, field: string): EntryDraft | null {
  const value = draft[field]
  if (typeof value !== "object" || value === null) return null
  return value as EntryDraft
}

function signSatisfied(sign: TransactionEntrySign, amount: number): boolean {
  switch (sign) {
    case "positive":
      return amount > 0
    case "negative":
      return amount < 0
    case "nonZero":
      return amount !== 0
  }
}

function ruleSatisfied(
  kind: TransactionRuleKind,
  a: EntryDraft,
  b: EntryDraft
): boolean | null {
  switch (kind) {
    case "sameAccount":
      if (a.account_id === undefined || b.account_id === undefined) return null
      return a.account_id === b.account_id
    case "differentAccounts":
      if (a.account_id === undefined || b.account_id === undefined) return null
      return a.account_id !== b.account_id
    case "sameAsset":
      if (a.asset_id === undefined || b.asset_id === undefined) return null
      return a.asset_id === b.asset_id
    case "equalMagnitude":
      if (typeof a.amount !== "number" || typeof b.amount !== "number") {
        return null
      }
      return a.amount + b.amount === 0
  }
}

/**
 * Mirrors `server/shared/src/view_models/transactions/validation.rs`, including its
 * exact field paths and messages, so client-side errors and server-side errors are
 * indistinguishable to the form layer. Operands that are absent are skipped, which
 * makes it safe to run against a half-filled editor draft.
 */
export function checkTransactionRules(
  type: TransactionTypeTag,
  draft: TransactionDraft
): TransactionFieldIssue[] {
  const config: AnyTransactionTypeConfig = TRANSACTION_TYPE_CONFIG[type]
  const issues: TransactionFieldIssue[] = []

  for (const slot of config.entries) {
    const entry = readEntry(draft, slot.field)
    if (entry === null || typeof entry.amount !== "number") continue
    if (!signSatisfied(slot.sign, entry.amount)) {
      issues.push({
        field: `${slot.field}.amount`,
        message: SIGN_MESSAGES[slot.sign],
      })
    }
  }

  for (const rule of config.rules) {
    const [fieldA, fieldB] = rule.fields
    const entryA = readEntry(draft, fieldA)
    const entryB = readEntry(draft, fieldB)
    if (entryA === null || entryB === null) continue
    if (ruleSatisfied(rule.kind, entryA, entryB) !== false) continue
    const property = RULE_PROPERTY[rule.kind]
    const message = ruleMessage(rule.kind, fieldA, fieldB)
    issues.push({ field: `${fieldA}.${property}`, message })
    issues.push({ field: `${fieldB}.${property}`, message })
  }

  return issues
}

// guid, not uuid: the server issues ids Rust's Uuid accepts, which include forms
// with no RFC 4122 version/variant bits. z.uuid() would reject them as unselectable.
const accountIdField = z.guid("Select an account.")
const assetIdField = z.int().positive("Select an asset.")
const amountField = z.number().finite("Enter an amount.")
const dateField = z.int("Select a date.")
const categoryIdField = z.int().positive("Select a category.")

const transactionEntrySchema = z.object({
  account_id: accountIdField,
  asset_id: assetIdField,
  amount: amountField,
})

const transactionFeeSchema = z.object({
  account_id: accountIdField,
  asset_id: assetIdField,
  amount: amountField,
  fee_type: z.enum(["transaction", "exchange", "withholding_tax"]),
})

const feesField = z.array(transactionFeeSchema).nullish()

const descriptionField = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed === undefined || trimmed === "" ? undefined : trimmed
  })
  .check((ctx) => {
    if (ctx.value !== undefined && ctx.value.length > DESCRIPTION_MAX_LENGTH) {
      ctx.issues.push({
        code: "too_big",
        origin: "string",
        maximum: DESCRIPTION_MAX_LENGTH,
        message: DESCRIPTION_LENGTH_MESSAGE,
        input: ctx.value,
      })
    }
  })

function withDomainRules<S extends z.ZodObject>(
  type: TransactionTypeTag,
  schema: S
): S {
  return schema.check((ctx) => {
    for (const issue of checkTransactionRules(
      type,
      ctx.value as TransactionDraft
    )) {
      ctx.issues.push({
        code: "custom",
        message: issue.message,
        path: issue.field.split("."),
        input: ctx.value,
      })
    }
  }) as S
}

const singleEntry = { date: dateField, fees: feesField } as const

export const transactionInputSchemas = {
  regular: withDomainRules(
    "regular",
    z.object({
      ...singleEntry,
      type: z.literal("regular"),
      entry: transactionEntrySchema,
      category_id: categoryIdField,
      description: descriptionField,
    })
  ),
  account_fees: withDomainRules(
    "account_fees",
    z.object({
      ...singleEntry,
      type: z.literal("account_fees"),
      entry: transactionEntrySchema,
    })
  ),
  cash_transfer_in: withDomainRules(
    "cash_transfer_in",
    z.object({
      ...singleEntry,
      type: z.literal("cash_transfer_in"),
      entry: transactionEntrySchema,
    })
  ),
  cash_transfer_out: withDomainRules(
    "cash_transfer_out",
    z.object({
      ...singleEntry,
      type: z.literal("cash_transfer_out"),
      entry: transactionEntrySchema,
    })
  ),
  cash_balance_transfer: withDomainRules(
    "cash_balance_transfer",
    z.object({
      ...singleEntry,
      type: z.literal("cash_balance_transfer"),
      outgoing_change: transactionEntrySchema,
      incoming_change: transactionEntrySchema,
    })
  ),
  asset_transfer_in: withDomainRules(
    "asset_transfer_in",
    z.object({
      ...singleEntry,
      type: z.literal("asset_transfer_in"),
      entry: transactionEntrySchema,
    })
  ),
  asset_transfer_out: withDomainRules(
    "asset_transfer_out",
    z.object({
      ...singleEntry,
      type: z.literal("asset_transfer_out"),
      entry: transactionEntrySchema,
    })
  ),
  asset_balance_transfer: withDomainRules(
    "asset_balance_transfer",
    z.object({
      ...singleEntry,
      type: z.literal("asset_balance_transfer"),
      outgoing_change: transactionEntrySchema,
      incoming_change: transactionEntrySchema,
    })
  ),
  asset_purchase: withDomainRules(
    "asset_purchase",
    z.object({
      ...singleEntry,
      type: z.literal("asset_purchase"),
      purchase_change: transactionEntrySchema,
      cash_outgoings_change: transactionEntrySchema,
    })
  ),
  asset_sale: withDomainRules(
    "asset_sale",
    z.object({
      ...singleEntry,
      type: z.literal("asset_sale"),
      sale_entry: transactionEntrySchema,
      proceeds_entry: transactionEntrySchema,
    })
  ),
  asset_trade: withDomainRules(
    "asset_trade",
    z.object({
      ...singleEntry,
      type: z.literal("asset_trade"),
      outgoing_entry: transactionEntrySchema,
      incoming_entry: transactionEntrySchema,
    })
  ),
  cash_dividend: withDomainRules(
    "cash_dividend",
    z.object({
      ...singleEntry,
      type: z.literal("cash_dividend"),
      entry: transactionEntrySchema,
      origin_asset_id: assetIdField,
    })
  ),
  asset_dividend: withDomainRules(
    "asset_dividend",
    z.object({
      ...singleEntry,
      type: z.literal("asset_dividend"),
      entry: transactionEntrySchema,
    })
  ),
} satisfies {
  [T in TransactionTypeTag]: z.ZodType<Extract<TransactionInput, { type: T }>>
}

export type TransactionInputSchema<T extends TransactionTypeTag> =
  (typeof transactionInputSchemas)[T]

const transactionInputSchema = z.discriminatedUnion("type", [
  transactionInputSchemas.regular,
  transactionInputSchemas.account_fees,
  transactionInputSchemas.cash_transfer_in,
  transactionInputSchemas.cash_transfer_out,
  transactionInputSchemas.cash_balance_transfer,
  transactionInputSchemas.asset_transfer_in,
  transactionInputSchemas.asset_transfer_out,
  transactionInputSchemas.asset_balance_transfer,
  transactionInputSchemas.asset_purchase,
  transactionInputSchemas.asset_sale,
  transactionInputSchemas.asset_trade,
  transactionInputSchemas.cash_dividend,
  transactionInputSchemas.asset_dividend,
])

export function getTransactionInputSchema<T extends TransactionTypeTag>(
  type: T
): TransactionInputSchema<T> {
  return transactionInputSchemas[type]
}

export type TransactionInputValidation =
  | { ok: true; value: TransactionInput }
  | {
      ok: false
      issues: TransactionFieldIssue[]
      fieldErrors: Record<string, string[]>
    }

function issuePath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((accumulator, segment) => {
    if (typeof segment === "number") return `${accumulator}[${segment}]`
    if (accumulator === "") return String(segment)
    return `${accumulator}.${String(segment)}`
  }, "")
}

function toTransactionFieldErrors(
  issues: TransactionFieldIssue[]
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {}
  for (const issue of issues) {
    const bucket = grouped[issue.field]
    if (bucket === undefined) grouped[issue.field] = [issue.message]
    else if (!bucket.includes(issue.message)) bucket.push(issue.message)
  }
  return grouped
}

function toValidation(
  result: z.ZodSafeParseResult<TransactionInput>
): TransactionInputValidation {
  if (result.success) return { ok: true, value: result.data }
  const issues = result.error.issues.map((issue) => ({
    field: issuePath(issue.path),
    message: issue.message,
  }))
  return { ok: false, issues, fieldErrors: toTransactionFieldErrors(issues) }
}

export function validateTransactionInput(
  input: unknown
): TransactionInputValidation {
  return toValidation(
    transactionInputSchema.safeParse(
      input
    ) as z.ZodSafeParseResult<TransactionInput>
  )
}

export function validateTransactionInputOfType<T extends TransactionTypeTag>(
  type: T,
  input: unknown
): TransactionInputValidation {
  return toValidation(
    transactionInputSchemas[type].safeParse(
      input
    ) as z.ZodSafeParseResult<TransactionInput>
  )
}

export function impliedUnitPrice(
  units: number | null | undefined,
  cash: number | null | undefined
): number | null {
  if (typeof units !== "number" || typeof cash !== "number") return null
  if (units === 0 || !Number.isFinite(units) || !Number.isFinite(cash)) {
    return null
  }
  return Math.abs(cash) / Math.abs(units)
}
