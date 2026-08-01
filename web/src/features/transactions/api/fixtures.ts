import type {
  CombinedTransactionItem,
  CombinedTransactionsPage,
  MetadataLookupTables,
  RequiredIdentifiableTransaction,
  TransactionEntryWithRequiredEntryId,
} from "@/api"

export const ACCOUNT_CURRENT = "11111111-1111-1111-1111-111111111111"
export const ACCOUNT_ISA = "22222222-2222-2222-2222-222222222222"

export const ASSET_GBP = 1
export const ASSET_USD = 2
export const ASSET_VUSA = 40
export const ASSET_BTC = 41

export const CATEGORY_GROCERIES = 7

export const lookupTables: MetadataLookupTables = {
  accounts: [
    { account_id: ACCOUNT_CURRENT, account_type: 1, name: "Lloyds Current" },
    { account_id: ACCOUNT_ISA, account_type: 3, name: "Trading 212 ISA" },
  ],
  assets: [
    {
      asset_id: ASSET_GBP,
      asset_type: 1,
      name: "Pound sterling",
      ticker: "GBP",
    },
    { asset_id: ASSET_USD, asset_type: 1, name: "US dollar", ticker: "USD" },
    {
      asset_id: ASSET_VUSA,
      asset_type: 5,
      name: "Vanguard S&P 500",
      ticker: "VUSA.LSE",
    },
    { asset_id: ASSET_BTC, asset_type: 7, name: "Bitcoin", ticker: "BTC" },
  ],
  categories: [
    {
      id: CATEGORY_GROCERIES,
      category: "Groceries",
      category_type: 2,
      icon: "shopping-cart",
      is_global: true,
      is_system: false,
    },
  ],
}

export function at<T>(items: readonly T[], index: number): T {
  const value = items[index]
  if (value === undefined)
    throw new Error(`No element at index ${String(index)}`)
  return value
}

let nextEntryId = 1

export function entry(
  accountId: string,
  assetId: number,
  amount: number
): TransactionEntryWithRequiredEntryId {
  nextEntryId += 1
  return {
    account_id: accountId,
    asset_id: assetId,
    amount,
    entry_id: nextEntryId,
  }
}

export const DAY = 1_753_920_000

export function regular(
  overrides: Partial<
    Extract<RequiredIdentifiableTransaction, { type: "regular" }>
  > = {}
): RequiredIdentifiableTransaction {
  return {
    type: "regular",
    transaction_id: "tx-regular",
    date: DAY,
    category_id: CATEGORY_GROCERIES,
    description: "Tesco",
    entry: entry(ACCOUNT_CURRENT, ASSET_GBP, -42.18),
    ...overrides,
  }
}

export function assetPurchase(
  overrides: Partial<
    Extract<RequiredIdentifiableTransaction, { type: "asset_purchase" }>
  > = {}
): RequiredIdentifiableTransaction {
  return {
    type: "asset_purchase",
    transaction_id: "tx-purchase",
    date: DAY,
    purchase_change: entry(ACCOUNT_ISA, ASSET_VUSA, 8),
    cash_outgoings_change: entry(ACCOUNT_ISA, ASSET_GBP, -672.8),
    ...overrides,
  }
}

export function assetSale(): RequiredIdentifiableTransaction {
  return {
    type: "asset_sale",
    transaction_id: "tx-sale",
    date: DAY,
    sale_entry: entry(ACCOUNT_ISA, ASSET_VUSA, -4),
    proceeds_entry: entry(ACCOUNT_ISA, ASSET_GBP, 340),
  }
}

export function assetTrade(): RequiredIdentifiableTransaction {
  return {
    type: "asset_trade",
    transaction_id: "tx-trade",
    date: DAY,
    outgoing_entry: entry(ACCOUNT_ISA, ASSET_BTC, -0.5),
    incoming_entry: entry(ACCOUNT_ISA, ASSET_VUSA, 12),
  }
}

export function cashBalanceTransfer(): RequiredIdentifiableTransaction {
  return {
    type: "cash_balance_transfer",
    transaction_id: "tx-move-cash",
    date: DAY,
    outgoing_change: entry(ACCOUNT_CURRENT, ASSET_GBP, -200),
    incoming_change: entry(ACCOUNT_ISA, ASSET_GBP, 200),
  }
}

export function cashDividend(): RequiredIdentifiableTransaction {
  return {
    type: "cash_dividend",
    transaction_id: "tx-dividend",
    date: DAY,
    origin_asset_id: ASSET_VUSA,
    entry: entry(ACCOUNT_ISA, ASSET_GBP, 12.4),
  }
}

export function accountFees(): RequiredIdentifiableTransaction {
  return {
    type: "account_fees",
    transaction_id: "tx-fee",
    date: DAY,
    entry: entry(ACCOUNT_ISA, ASSET_GBP, -1.2),
  }
}

export function ghostTransfer(): RequiredIdentifiableTransaction {
  return {
    type: "cash_transfer_in",
    transaction_id: "tx-ghost",
    date: DAY,
    visibility: "ghost",
    entry: entry(ACCOUNT_CURRENT, ASSET_GBP, 2400),
  }
}

export function individualItem(
  transaction: RequiredIdentifiableTransaction
): CombinedTransactionItem {
  return {
    item_type: "individual",
    ...transaction,
  } as unknown as CombinedTransactionItem
}

export function groupItem(
  transactions: RequiredIdentifiableTransaction[]
): CombinedTransactionItem {
  return {
    item_type: "group",
    group_id: "group-1",
    date: DAY,
    description: "Weekly shop",
    category_id: CATEGORY_GROCERIES,
    transactions,
  } as unknown as CombinedTransactionItem
}

export function combinedPage(
  results: CombinedTransactionItem[],
  overrides: Partial<CombinedTransactionsPage> = {}
): CombinedTransactionsPage {
  return {
    results,
    has_more: false,
    next_cursor: null,
    total_results: null,
    lookup_tables: lookupTables,
    ...overrides,
  }
}
