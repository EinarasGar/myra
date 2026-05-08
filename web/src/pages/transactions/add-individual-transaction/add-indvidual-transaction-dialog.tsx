import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionTypeSelector } from "./transaction-type-selector";
import { useState, type ReactNode } from "react";
import AddTransactionForm, {
  type IndividualFormInitialValues,
} from "./add-transaction-from";
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
import { cn } from "@/lib/utils";

const SPECIALIZED_TYPES = [
  "asset_purchase",
  "asset_sale",
  "cash_transfer_in",
  "cash_transfer_out",
  "cash_dividend",
  "asset_dividend",
  "asset_transfer_out",
  "asset_transfer_in",
  "asset_trade",
  "asset_balance_transfer",
  "account_fees",
];

interface AddIndividualTranscationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: string;
  initialValues?: IndividualFormInitialValues;
  initialValuesKey?: string;
  extraSidePanel?: ReactNode;
  onSubmittedSuccessfully?: () => void;
}

export function AddIndividualTranscationDialog({
  open,
  onOpenChange,
  initialType,
  initialValues,
  initialValuesKey,
  extraSidePanel,
  onSubmittedSuccessfully,
}: AddIndividualTranscationDialogProps) {
  const [selectedType, setSelectedType] = useState<string | null>(
    initialType ?? null,
  );

  const [prevInitialType, setPrevInitialType] = useState(initialType);
  if (initialType !== prevInitialType) {
    setPrevInitialType(initialType);
    if (initialType) setSelectedType(initialType);
  }

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value && !initialType) {
      setSelectedType(null);
    }
  };

  const handleSuccess = () => {
    onSubmittedSuccessfully?.();
    handleOpenChange(false);
  };

  const wide = !!extraSidePanel;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
          {!selectedType && (
            <DialogDescription>Select transaction type.</DialogDescription>
          )}
        </DialogHeader>
        <div
          className={cn(
            wide && "grid grid-cols-[minmax(0,1fr)_280px] gap-4 min-w-0",
          )}
        >
          <div className="flex flex-col gap-4 min-w-0">
            {!selectedType && (
              <TransactionTypeSelector
                onSelected={(type) => setSelectedType(type)}
              />
            )}
            {selectedType === "asset_purchase" && (
              <AddAssetPurchaseForm onSuccess={handleSuccess} />
            )}
            {selectedType === "asset_sale" && (
              <AddAssetSaleForm onSuccess={handleSuccess} />
            )}
            {selectedType === "cash_transfer_in" && (
              <AddCashTransferInForm onSuccess={handleSuccess} />
            )}
            {selectedType === "cash_transfer_out" && (
              <AddCashTransferOutForm onSuccess={handleSuccess} />
            )}
            {selectedType === "cash_dividend" && (
              <AddCashDividendForm onSuccess={handleSuccess} />
            )}
            {selectedType === "asset_dividend" && (
              <AddAssetDividendForm onSuccess={handleSuccess} />
            )}
            {selectedType === "asset_transfer_out" && (
              <AddAssetTransferOutForm onSuccess={handleSuccess} />
            )}
            {selectedType === "asset_transfer_in" && (
              <AddAssetTransferInForm onSuccess={handleSuccess} />
            )}
            {selectedType === "asset_trade" && (
              <AddAssetTradeForm onSuccess={handleSuccess} />
            )}
            {selectedType === "asset_balance_transfer" && (
              <AddAssetBalanceTransferForm onSuccess={handleSuccess} />
            )}
            {selectedType === "account_fees" && (
              <AddAccountFeesForm onSuccess={handleSuccess} />
            )}
            {selectedType && !SPECIALIZED_TYPES.includes(selectedType) && (
              <AddTransactionForm
                type={selectedType}
                onSuccess={handleSuccess}
                initialValues={initialValues}
                initialValuesKey={initialValuesKey}
              />
            )}
          </div>
          {extraSidePanel && (
            <div className="border-l pl-4 flex flex-col">{extraSidePanel}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
