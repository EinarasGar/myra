import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionTypeSelector } from "./transaction-type-selector";
import { useState } from "react";
import AddTransactionForm from "./add-transaction-from";
import AddAssetPurchaseForm from "./add-asset-purchase-form";
import AddAssetSaleForm from "./add-asset-sale-form";
import AddCashTransferInForm from "./add-cash-transfer-in-form";
import AddCashTransferOutForm from "./add-cash-transfer-out-form";
import AddCashDividendForm from "./add-cash-dividend-form";
import AddAssetDividendForm from "./add-asset-dividend-form";
import AddAssetTransferOutForm from "./add-asset-transfer-out-form";
import AddAssetTransferInForm from "./add-asset-transfer-in-form";
import AddAssetTradeForm from "./add-asset-trade-form";
import AddAssetBalanceTransferForm from "./add-asset-balance-transfer-form";
import AddAccountFeesForm from "./add-account-fees-form";

const SPECIALIZED_TYPES = ["asset_purchase", "asset_sale", "cash_transfer_in", "cash_transfer_out", "cash_dividend", "asset_dividend", "asset_transfer_out", "asset_transfer_in", "asset_trade", "asset_balance_transfer", "account_fees"];

export function AddIndividualTranscationDialog() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setSelectedType(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        Edit Profile
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add new transaction</DialogTitle>
          <DialogDescription>Select transaction type.</DialogDescription>
        </DialogHeader>
        {!selectedType && (
          <TransactionTypeSelector
            onSelected={(type) => setSelectedType(type)}
          />
        )}
        {selectedType === "asset_purchase" && (
          <AddAssetPurchaseForm
            onSuccess={() => handleOpenChange(false)}
          />
        )}
        {selectedType === "asset_sale" && (
          <AddAssetSaleForm
            onSuccess={() => handleOpenChange(false)}
          />
        )}
        {selectedType === "cash_transfer_in" && (
          <AddCashTransferInForm
            onSuccess={() => handleOpenChange(false)}
          />
        )}
        {selectedType === "cash_transfer_out" && (
          <AddCashTransferOutForm
            onSuccess={() => handleOpenChange(false)}
          />
        )}
        {selectedType === "cash_dividend" && (
          <AddCashDividendForm
            onSuccess={() => handleOpenChange(false)}
          />
        )}
        {selectedType === "asset_dividend" && (
          <AddAssetDividendForm
            onSuccess={() => handleOpenChange(false)}
          />
        )}
        {selectedType === "asset_transfer_out" && (
          <AddAssetTransferOutForm onSuccess={() => handleOpenChange(false)} />
        )}
        {selectedType === "asset_transfer_in" && (
          <AddAssetTransferInForm onSuccess={() => handleOpenChange(false)} />
        )}
        {selectedType === "asset_trade" && (
          <AddAssetTradeForm onSuccess={() => handleOpenChange(false)} />
        )}
        {selectedType === "asset_balance_transfer" && (
          <AddAssetBalanceTransferForm onSuccess={() => handleOpenChange(false)} />
        )}
        {selectedType === "account_fees" && (
          <AddAccountFeesForm onSuccess={() => handleOpenChange(false)} />
        )}
        {selectedType && !SPECIALIZED_TYPES.includes(selectedType) && (
          <AddTransactionForm
            type={selectedType}
            onSuccess={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
