import type { ReactNode } from "react";
import type { RequiredIdentifiableTransaction } from "@/api/api";
import { useAccountStore } from "@/hooks/store/use-account-store";
import { useAssetStore } from "@/hooks/store/use-asset-store";
import { useCategoryStore } from "@/hooks/store/use-category-store";
import { cn } from "@/lib/utils";
import {
  formatTransactionDate,
  getTransactionTypeLabel,
  getTransactionAmount,
  getTransactionAccountId,
  getTransactionAssetId,
  getTransactionCategoryId,
} from "./transaction-display-utils";
import TransactionTypeBadge from "./transaction-type-badge";
import { TableRow, TableCell } from "@/components/ui/table";

interface TransactionRowProps {
  transaction: RequiredIdentifiableTransaction;
  onClick: () => void;
  isChild?: boolean;
  avatarCell?: ReactNode;
  actionsCell?: ReactNode;
}

export default function TransactionRow({
  transaction,
  onClick,
  isChild,
  avatarCell,
  actionsCell,
}: TransactionRowProps) {
  const accounts = useAccountStore((state) => state.accounts);
  const assets = useAssetStore((state) => state.assets);
  const categories = useCategoryStore((state) => state.categorys);

  const accountId = getTransactionAccountId(transaction);
  const assetId = getTransactionAssetId(transaction);
  const categoryId = getTransactionCategoryId(transaction);
  const accountName = accountId
    ? (accounts.find((a) => a.id === accountId)?.name ?? "—")
    : "—";
  const assetTicker = assetId
    ? (assets.find((a) => a.id === assetId)?.ticker ?? "—")
    : "—";
  const categoryName = categoryId
    ? (categories.find((c) => c.id === categoryId)?.name ?? "—")
    : "—";
  const description =
    "description" in transaction && transaction.description
      ? transaction.description
      : getTransactionTypeLabel(transaction.type);

  return (
    <TableRow
      className={cn(
        "cursor-pointer",
        isChild && "bg-muted/20 border-l-2 border-l-primary/40",
      )}
      onClick={onClick}
    >
      {avatarCell}
      <TableCell
        className="text-sm"
        title={formatTransactionDate(transaction.date)}
      >
        {formatTransactionDate(transaction.date)}
      </TableCell>
      <TableCell
        className={cn("text-sm max-w-0 truncate", isChild && "pl-6")}
        title={description}
      >
        {description}
      </TableCell>
      <TableCell title={getTransactionTypeLabel(transaction.type)}>
        <TransactionTypeBadge type={transaction.type} />
      </TableCell>
      <TableCell className="text-sm max-w-0 truncate" title={accountName}>
        {accountName}
      </TableCell>
      <TableCell className="text-sm" title={assetTicker}>
        {assetTicker}
      </TableCell>
      <TableCell className="text-sm max-w-0 truncate" title={categoryName}>
        {categoryName}
      </TableCell>
      <TableCell
        className="text-sm text-right font-medium max-w-0 truncate"
        title={getTransactionAmount(transaction, assets)}
      >
        {getTransactionAmount(transaction, assets)}
      </TableCell>
      {actionsCell ?? <TableCell />}
    </TableRow>
  );
}
