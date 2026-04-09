import type { ReactNode } from "react";
import type { GroupTransactionItem } from "@/api/api";
import { Badge } from "@/components/ui/badge";
import { TableRow, TableCell } from "@/components/ui/table";
import { useAccountStore } from "@/hooks/store/use-account-store";
import { useCategoryStore } from "@/hooks/store/use-category-store";
import { useAssetStore } from "@/hooks/store/use-asset-store";
import {
  formatTransactionDate,
  getGroupAmountSummary,
  getGroupAccountSummary,
} from "./transaction-display-utils";

interface TransactionGroupRowProps {
  group: GroupTransactionItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDetailClick: () => void;
  avatarCell?: ReactNode;
  actionsCell?: ReactNode;
}

export default function TransactionGroupRow({
  group,
  onToggleExpand,
  onDetailClick,
  avatarCell,
  actionsCell,
}: TransactionGroupRowProps) {
  const accounts = useAccountStore((state) => state.accounts);
  const categories = useCategoryStore((state) => state.categorys);
  const assets = useAssetStore((state) => state.assets);
  const categoryName =
    categories.find((c) => c.id === group.category_id)?.name ?? "—";

  return (
    <TableRow className="cursor-pointer bg-muted/30" onClick={onToggleExpand}>
      {avatarCell}
      <TableCell className="text-sm">
        {formatTransactionDate(group.date)}
      </TableCell>
      <TableCell
        className="text-sm font-medium max-w-0 truncate hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onDetailClick();
        }}
      >
        {group.description}
      </TableCell>
      <TableCell>
        <Badge variant="outline">Group · {group.transactions.length}</Badge>
      </TableCell>
      <TableCell className="text-sm max-w-0 truncate">
        {getGroupAccountSummary(group, accounts)}
      </TableCell>
      <TableCell className="text-sm">—</TableCell>
      <TableCell className="text-sm max-w-0 truncate">{categoryName}</TableCell>
      <TableCell
        className="text-sm text-right font-medium max-w-0 truncate"
        title={getGroupAmountSummary(group, assets)}
      >
        {getGroupAmountSummary(group, assets)}
      </TableCell>
      {actionsCell}
    </TableRow>
  );
}
