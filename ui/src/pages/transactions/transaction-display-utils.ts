import type { RequiredIdentifiableTransaction, TransactionEntryWithRequiredEntryId } from "@/api";
import type { CombinedTransactionItem } from "@/api/api";
import type { GroupTransactionItem } from '@/api/api';
import type { Account } from "@/types/account";
import type { Asset } from "@/types/assets";

// Format a unix timestamp to readable date
export function formatTransactionDate(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Get display-friendly type label
export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    asset_purchase: "Asset Buy",
    asset_sale: "Asset Sell",
    cash_transfer_in: "Cash In",
    cash_transfer_out: "Cash Out",
    cash_dividend: "Dividend",
    asset_dividend: "Dividend",
    asset_trade: "Trade",
    asset_transfer_in: "Transfer In",
    asset_transfer_out: "Transfer Out",
    asset_balance_transfer: "Balance Transfer",
    account_fees: "Fees",
    regular: "Transaction",
  };
  return labels[type] ?? type;
}

// Get the primary amount display for a transaction
export function getTransactionAmount(
  transaction: RequiredIdentifiableTransaction,
  assets: Asset[],
): string {
  const findAsset = (id: number) => assets.find((a) => a.id === id);

  switch (transaction.type) {
    case "asset_purchase": {
      const purchaseAsset = findAsset(transaction.purchase_change.asset_id);
      const cashAsset = findAsset(transaction.cash_outgoings_change.asset_id);
      return `${transaction.cash_outgoings_change.amount} ${cashAsset?.ticker ?? ""} → ${transaction.purchase_change.amount} ${purchaseAsset?.ticker ?? ""}`;
    }
    case "asset_sale": {
      const saleAsset = findAsset(transaction.sale_entry.asset_id);
      const proceedsAsset = findAsset(transaction.proceeds_entry.asset_id);
      return `${transaction.sale_entry.amount} ${saleAsset?.ticker ?? ""} → ${transaction.proceeds_entry.amount} ${proceedsAsset?.ticker ?? ""}`;
    }
    case "asset_trade": {
      const outAsset = findAsset(transaction.outgoing_entry.asset_id);
      const inAsset = findAsset(transaction.incoming_entry.asset_id);
      return `${transaction.outgoing_entry.amount} ${outAsset?.ticker ?? ""} → ${transaction.incoming_entry.amount} ${inAsset?.ticker ?? ""}`;
    }
    case "asset_balance_transfer": {
      const outAsset = findAsset(transaction.outgoing_change.asset_id);
      const inAsset = findAsset(transaction.incoming_change.asset_id);
      return `${transaction.outgoing_change.amount} ${outAsset?.ticker ?? ""} → ${transaction.incoming_change.amount} ${inAsset?.ticker ?? ""}`;
    }
    default: {
      if ("entry" in transaction) {
        const entry = transaction.entry as TransactionEntryWithRequiredEntryId;
        const asset = findAsset(entry.asset_id);
        return `${entry.amount} ${asset?.ticker ?? ""}`;
      }
      return "";
    }
  }
}

// Get the primary account id from a transaction
export function getTransactionAccountId(
  transaction: RequiredIdentifiableTransaction,
): string | null {
  if ("entry" in transaction) return (transaction.entry as TransactionEntryWithRequiredEntryId).account_id;
  if (transaction.type === "asset_purchase") return transaction.cash_outgoings_change.account_id;
  if (transaction.type === "asset_sale") return transaction.sale_entry.account_id;
  if (transaction.type === "asset_trade") return transaction.outgoing_entry.account_id;
  if (transaction.type === "asset_balance_transfer") return transaction.outgoing_change.account_id;
  return null;
}

// Get the primary asset id from a transaction
export function getTransactionAssetId(
  transaction: RequiredIdentifiableTransaction,
): number | null {
  if ("entry" in transaction) return (transaction.entry as TransactionEntryWithRequiredEntryId).asset_id;
  if (transaction.type === "asset_purchase") return transaction.purchase_change.asset_id;
  if (transaction.type === "asset_sale") return transaction.sale_entry.asset_id;
  if (transaction.type === "asset_trade") return transaction.outgoing_entry.asset_id;
  if (transaction.type === "asset_balance_transfer") return transaction.outgoing_change.asset_id;
  return null;
}

// Get the category id from a transaction (only regular type has category_id)
export function getTransactionCategoryId(
  transaction: RequiredIdentifiableTransaction,
): number | null {
  if (transaction.type === "regular" && "category_id" in transaction) {
    return (transaction as unknown as { category_id: number }).category_id;
  }
  return null;
}

// Returns array of { amount, ticker } entries for all legs of a transaction
export function getTransactionAmountEntries(
  transaction: RequiredIdentifiableTransaction,
  assets: Asset[],
): { amount: number; ticker: string }[] {
  const findTicker = (id: number) => assets.find(a => a.id === id)?.ticker ?? '?';

  switch (transaction.type) {
    case 'asset_purchase':
      return [
        { amount: -Math.abs(Number(transaction.cash_outgoings_change.amount)), ticker: findTicker(transaction.cash_outgoings_change.asset_id) },
        { amount: Math.abs(Number(transaction.purchase_change.amount)), ticker: findTicker(transaction.purchase_change.asset_id) },
      ];
    case 'asset_sale':
      return [
        { amount: -Math.abs(Number(transaction.sale_entry.amount)), ticker: findTicker(transaction.sale_entry.asset_id) },
        { amount: Math.abs(Number(transaction.proceeds_entry.amount)), ticker: findTicker(transaction.proceeds_entry.asset_id) },
      ];
    case 'asset_trade':
      return [
        { amount: -Math.abs(Number(transaction.outgoing_entry.amount)), ticker: findTicker(transaction.outgoing_entry.asset_id) },
        { amount: Math.abs(Number(transaction.incoming_entry.amount)), ticker: findTicker(transaction.incoming_entry.asset_id) },
      ];
    case 'asset_balance_transfer':
      return [
        { amount: -Math.abs(Number(transaction.outgoing_change.amount)), ticker: findTicker(transaction.outgoing_change.asset_id) },
        { amount: Math.abs(Number(transaction.incoming_change.amount)), ticker: findTicker(transaction.incoming_change.asset_id) },
      ];
    default: {
      if ('entry' in transaction) {
        const entry = transaction.entry as TransactionEntryWithRequiredEntryId;
        return [{ amount: Number(entry.amount), ticker: findTicker(entry.asset_id) }];
      }
      return [];
    }
  }
}

export function getGroupAccountSummary(
  group: GroupTransactionItem,
  accounts: Account[],
): string {
  if (group.transactions.length === 0) return '—';

  const uniqueAccountIds = new Set<string>();
  for (const tx of group.transactions) {
    const accountId = getTransactionAccountId(tx);
    if (accountId) uniqueAccountIds.add(accountId);
  }

  if (uniqueAccountIds.size === 0) return '—';

  const accountIds = Array.from(uniqueAccountIds);
  const firstName = accounts.find(a => a.id === accountIds[0])?.name ?? '—';

  if (accountIds.length === 1) return firstName;
  return `${firstName} +${accountIds.length - 1} more`;
}

/**
 * Find individual transactions by ID, searching both top-level items and
 * nested children inside groups. Returns `RequiredIdentifiableTransaction[]`.
 */
export function findTransactionsByIds(
  allItems: CombinedTransactionItem[],
  ids: Set<string> | string[],
): RequiredIdentifiableTransaction[] {
  const idSet = ids instanceof Set ? ids : new Set(ids);
  const found: RequiredIdentifiableTransaction[] = [];
  for (const item of allItems) {
    if (item.item_type === 'individual') {
      const tx = item as unknown as RequiredIdentifiableTransaction;
      if (idSet.has(tx.transaction_id)) {
        found.push(tx);
      }
    } else if (item.item_type === 'group') {
      for (const child of item.transactions) {
        if (idSet.has(child.transaction_id)) {
          found.push(child);
        }
      }
    }
  }
  return found;
}

export function getGroupAmountSummary(group: GroupTransactionItem, assets: Asset[]): string {
  if (group.transactions.length === 0) return '—';

  // Aggregate amounts per ticker
  const totals = new Map<string, number>();
  for (const tx of group.transactions) {
    for (const { amount, ticker } of getTransactionAmountEntries(tx, assets)) {
      totals.set(ticker, (totals.get(ticker) ?? 0) + amount);
    }
  }

  if (totals.size === 0) return '—';

  // Format each ticker's total
  const formatEntry = (ticker: string, amount: number) => {
    const rounded = Math.round(amount * 100) / 100;
    return `${rounded} ${ticker}`;
  };

  // Sort by absolute value descending so most significant amounts come first
  const sorted = Array.from(totals.entries())
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));

  if (sorted.length <= 2) {
    return sorted.map(([ticker, amount]) => formatEntry(ticker, amount)).join(', ');
  }

  // Show top 2 + "and N more"
  const shown = sorted.slice(0, 2).map(([ticker, amount]) => formatEntry(ticker, amount));
  return `${shown.join(', ')} +${sorted.length - 2} more`;
}
