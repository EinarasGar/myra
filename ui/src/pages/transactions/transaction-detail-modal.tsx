import type { RequiredIdentifiableTransaction } from '@/api/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useAccountStore } from '@/hooks/store/use-account-store';
import { useAssetStore } from '@/hooks/store/use-asset-store';
import { useCategoryStore } from '@/hooks/store/use-category-store';
import { formatTransactionDate, getTransactionTypeLabel, getTransactionAmount, getTransactionAccountId, getTransactionAssetId, getTransactionCategoryId } from './transaction-display-utils';
import TransactionTypeBadge from './transaction-type-badge';

interface TransactionDetailModalProps {
  transaction: RequiredIdentifiableTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TransactionDetailModal({ transaction, open, onOpenChange }: TransactionDetailModalProps) {
  const accounts = useAccountStore((state) => state.accounts);
  const assets = useAssetStore((state) => state.assets);
  const categories = useCategoryStore((state) => state.categorys);

  if (!transaction) return null;

  const accountId = getTransactionAccountId(transaction);
  const assetId = getTransactionAssetId(transaction);
  const categoryId = getTransactionCategoryId(transaction);
  const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name ?? '—' : '—';
  const accountName = accountId ? accounts.find(a => a.id === accountId)?.name ?? 'Unknown' : '—';
  const assetTicker = assetId ? assets.find(a => a.id === assetId)?.ticker ?? 'Unknown' : '—';
  const description = 'description' in transaction && transaction.description
    ? transaction.description
    : getTransactionTypeLabel(transaction.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TransactionTypeBadge type={transaction.type} />
            <span className="text-sm text-muted-foreground">{formatTransactionDate(transaction.date)}</span>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Description</p>
              <p className="font-medium">{description}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-medium">{getTransactionAmount(transaction, assets)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Account</p>
              <p className="font-medium">{accountName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Asset</p>
              <p className="font-medium">{assetTicker}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{categoryName}</p>
            </div>
          </div>
          {'fees' in transaction && transaction.fees && transaction.fees.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Fees</p>
                {transaction.fees.map((fee: { amount: number; asset_id: number }, index: number) => {
                  const feeTicker = assets.find(a => a.id === fee.asset_id)?.ticker;
                  return (
                    <div key={index} className="text-sm flex justify-between">
                      <span>Fee {index + 1}</span>
                      <span className="font-medium">{fee.amount}{feeTicker ? ` ${feeTicker}` : ''}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
