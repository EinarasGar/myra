import type { ProposalPart } from "./types"

export type ProposalFieldValue =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "date"; readonly value: string }
  | { readonly kind: "account"; readonly accountId: string }
  | { readonly kind: "category"; readonly categoryId: number }
  | { readonly kind: "asset"; readonly assetId: number }
  | {
      readonly kind: "amount"
      readonly value: number
      readonly assetId: number | null
    }

export interface ProposalField {
  readonly key: string
  readonly label: string
  readonly value: ProposalFieldValue
}

export interface ProposalView {
  readonly toolCallId: string
  readonly tool: string
  readonly title: string
  readonly typeLabel: string
  readonly fields: readonly ProposalField[]
  readonly extras: readonly ProposalField[]
  readonly destructive: boolean
}

const TOOL_TITLES: Record<string, string> = {
  create_transaction: "Record a transaction",
  update_transaction: "Change a transaction",
  delete_transaction: "Delete a transaction",
  record_transfer: "Record a transfer",
  record_cash_transfer: "Record cash in or out",
  record_asset_transfer: "Record an asset moving in or out",
  record_asset_trade: "Record a trade",
  record_asset_swap: "Record a swap",
  record_dividend: "Record a dividend",
  record_fee: "Record a fee",
  create_custom_asset: "Create a custom asset",
  update_asset_valuation: "Value a custom asset",
}

const TOOL_TYPE_LABELS: Record<string, string> = {
  create_transaction: "Regular",
  update_transaction: "Edit",
  delete_transaction: "Delete",
  record_transfer: "Transfer",
  record_cash_transfer: "Cash transfer",
  record_asset_transfer: "Asset transfer",
  record_asset_trade: "Trade",
  record_asset_swap: "Swap",
  record_dividend: "Dividend",
  record_fee: "Fee",
  create_custom_asset: "Asset",
  update_asset_valuation: "Valuation",
}

const DESTRUCTIVE_TOOLS = new Set(["delete_transaction"])

const FIELD_LABELS: Record<string, string> = {
  account_id: "Account",
  from_account_id: "From account",
  to_account_id: "To account",
  category_id: "Category",
  asset_id: "Asset",
  from_asset_id: "From asset",
  to_asset_id: "To asset",
  paying_asset_id: "Paying asset",
  currency_asset_id: "Settled in",
  base_pair_id: "Priced against",
  amount: "Amount",
  total_amount: "Total",
  quantity: "Quantity",
  from_quantity: "Quantity out",
  to_quantity: "Quantity in",
  value: "Value",
  withholding_amount: "Withheld",
  date: "Date",
  description: "Description",
  transaction_id: "Transaction",
  transaction_ids: "Transactions",
  side: "Side",
  direction: "Direction",
  transfer_kind: "Kind",
  dividend_kind: "Kind",
  ticker: "Ticker",
  name: "Name",
  asset_type: "Asset type",
}

const HEADLINE_KEYS = [
  "description",
  "name",
  "date",
  "side",
  "direction",
  "transfer_kind",
  "dividend_kind",
  "amount",
  "total_amount",
  "quantity",
  "from_quantity",
  "to_quantity",
  "value",
  "account_id",
  "from_account_id",
  "to_account_id",
  "asset_id",
  "from_asset_id",
  "to_asset_id",
  "paying_asset_id",
  "category_id",
]

const AMOUNT_KEYS = new Set([
  "amount",
  "total_amount",
  "quantity",
  "from_quantity",
  "to_quantity",
  "value",
  "withholding_amount",
])

const ACCOUNT_KEYS = new Set(["account_id", "from_account_id", "to_account_id"])

const ASSET_KEYS = new Set([
  "asset_id",
  "from_asset_id",
  "to_asset_id",
  "paying_asset_id",
  "currency_asset_id",
  "base_pair_id",
])

export function toProposalView(proposal: ProposalPart): ProposalView {
  const args = asRecord(proposal.args) ?? {}
  const assetId =
    readInteger(args, "asset_id") ?? readInteger(args, "from_asset_id")

  const fields = Object.entries(args)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => ({
      key,
      label: FIELD_LABELS[key] ?? humanise(key),
      value: toFieldValue(key, value, assetId),
    }))

  const ranked = [...fields].sort(
    (a, b) => rankOf(a.key) - rankOf(b.key) || a.key.localeCompare(b.key)
  )

  return {
    toolCallId: proposal.toolCallId,
    tool: proposal.name,
    title: TOOL_TITLES[proposal.name] ?? humanise(proposal.name),
    typeLabel: TOOL_TYPE_LABELS[proposal.name] ?? "Write",
    fields: ranked.filter((field) => rankOf(field.key) < HEADLINE_KEYS.length),
    extras: ranked.filter((field) => rankOf(field.key) >= HEADLINE_KEYS.length),
    destructive: DESTRUCTIVE_TOOLS.has(proposal.name),
  }
}

function toFieldValue(
  key: string,
  raw: unknown,
  assetId: number | null
): ProposalFieldValue {
  if (AMOUNT_KEYS.has(key)) {
    const value = toNumber(raw)
    if (value !== null) {
      return {
        kind: "amount",
        value,
        assetId: key === "value" ? null : assetId,
      }
    }
  }
  if (ACCOUNT_KEYS.has(key) && typeof raw === "string") {
    return { kind: "account", accountId: raw }
  }
  if (ASSET_KEYS.has(key)) {
    const id = toInteger(raw)
    if (id !== null) return { kind: "asset", assetId: id }
  }
  if (key === "category_id") {
    const id = toInteger(raw)
    if (id !== null) return { kind: "category", categoryId: id }
  }
  if (key === "date" && typeof raw === "string") {
    return { kind: "date", value: raw }
  }
  return { kind: "text", text: toText(raw) }
}

function rankOf(key: string): number {
  const index = HEADLINE_KEYS.indexOf(key)
  return index === -1 ? HEADLINE_KEYS.length : index
}

function humanise(key: string): string {
  const words = key.replace(/_/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function toText(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) return value.map(toText).join(", ")
  try {
    return JSON.stringify(value) ?? ""
  } catch {
    return ""
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toInteger(value: unknown): number | null {
  const parsed = toNumber(value)
  return parsed === null ? null : Math.trunc(parsed)
}

function readInteger(
  source: Record<string, unknown>,
  key: string
): number | null {
  return toInteger(source[key])
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}
