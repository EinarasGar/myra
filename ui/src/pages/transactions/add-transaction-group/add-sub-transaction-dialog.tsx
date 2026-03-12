import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TransactionTypeSelector } from '../add-individual-transaction/transaction-type-selector';
import { useState } from 'react';
import type { TransactionInput } from '@/api';
import AddTransactionForm from '../add-individual-transaction/add-transaction-from';
import AddAssetPurchaseForm from '../add-individual-transaction/add-asset-purchase-form';
import AddAssetSaleForm from '../add-individual-transaction/add-asset-sale-form';
import AddCashTransferInForm from '../add-individual-transaction/add-cash-transfer-in-form';
import AddCashTransferOutForm from '../add-individual-transaction/add-cash-transfer-out-form';
import AddCashDividendForm from '../add-individual-transaction/add-cash-dividend-form';
import AddAssetDividendForm from '../add-individual-transaction/add-asset-dividend-form';
import AddAssetTransferOutForm from '../add-individual-transaction/add-asset-transfer-out-form';
import AddAssetTransferInForm from '../add-individual-transaction/add-asset-transfer-in-form';
import AddAssetTradeForm from '../add-individual-transaction/add-asset-trade-form';
import AddAssetBalanceTransferForm from '../add-individual-transaction/add-asset-balance-transfer-form';
import AddAccountFeesForm from '../add-individual-transaction/add-account-fees-form';

const SPECIALIZED_TYPES = ['asset_purchase', 'asset_sale', 'cash_transfer_in', 'cash_transfer_out', 'cash_dividend', 'asset_dividend', 'asset_transfer_out', 'asset_transfer_in', 'asset_trade', 'asset_balance_transfer', 'account_fees'];

interface AddSubTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCollect: (transaction: TransactionInput) => void;
}

export function AddSubTransactionDialog({ open, onOpenChange, onCollect }: AddSubTransactionDialogProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) setSelectedType(null);
  };

  const handleCollect = (transaction: TransactionInput) => {
    onCollect(transaction);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Transaction to Group</DialogTitle>
          {!selectedType && <DialogDescription>Select transaction type.</DialogDescription>}
        </DialogHeader>
        {!selectedType && <TransactionTypeSelector onSelected={setSelectedType} />}
        {selectedType === 'asset_purchase' && <AddAssetPurchaseForm onCollect={handleCollect} />}
        {selectedType === 'asset_sale' && <AddAssetSaleForm onCollect={handleCollect} />}
        {selectedType === 'cash_transfer_in' && <AddCashTransferInForm onCollect={handleCollect} />}
        {selectedType === 'cash_transfer_out' && <AddCashTransferOutForm onCollect={handleCollect} />}
        {selectedType === 'cash_dividend' && <AddCashDividendForm onCollect={handleCollect} />}
        {selectedType === 'asset_dividend' && <AddAssetDividendForm onCollect={handleCollect} />}
        {selectedType === 'asset_transfer_out' && <AddAssetTransferOutForm onCollect={handleCollect} />}
        {selectedType === 'asset_transfer_in' && <AddAssetTransferInForm onCollect={handleCollect} />}
        {selectedType === 'asset_trade' && <AddAssetTradeForm onCollect={handleCollect} />}
        {selectedType === 'asset_balance_transfer' && <AddAssetBalanceTransferForm onCollect={handleCollect} />}
        {selectedType === 'account_fees' && <AddAccountFeesForm onCollect={handleCollect} />}
        {selectedType && !SPECIALIZED_TYPES.includes(selectedType) && (
          <AddTransactionForm type={selectedType} onCollect={handleCollect} />
        )}
      </DialogContent>
    </Dialog>
  );
}
