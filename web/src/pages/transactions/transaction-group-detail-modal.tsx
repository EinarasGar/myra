import type { GroupTransactionItem } from "@/api/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAssetStore } from "@/hooks/store/use-asset-store";
import { useCategoryStore } from "@/hooks/store/use-category-store";
import {
  formatTransactionDate,
  getTransactionAmount,
} from "./transaction-display-utils";
import TransactionTypeBadge from "./transaction-type-badge";

interface TransactionGroupDetailModalProps {
  group: GroupTransactionItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TransactionGroupDetailModal({
  group,
  open,
  onOpenChange,
}: TransactionGroupDetailModalProps) {
  const assets = useAssetStore((state) => state.assets);
  const categories = useCategoryStore((state) => state.categorys);

  if (!group) return null;

  const categoryName =
    categories.find((c) => c.id === group.category_id)?.name ?? "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transaction Group Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="font-medium">{group.description}</p>
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{formatTransactionDate(group.date)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{categoryName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Transactions</p>
              <p className="font-medium">{group.transactions.length}</p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-3">Child Transactions</p>
            <div className="space-y-2">
              {group.transactions.map((tx) => (
                <div
                  key={tx.transaction_id}
                  className="flex items-center justify-between p-2 rounded bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <TransactionTypeBadge type={tx.type} />
                    <span className="text-sm">
                      {formatTransactionDate(tx.date)}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {getTransactionAmount(tx, assets)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
