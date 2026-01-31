import { useState } from "react";
import AccountPicker from "@/components/feature/account-picker";
import AssetAmountInput from "@/components/feature/asset-amount-input";
import { DateTimeLanguagePicker } from "@/components/feature/date-time-language-picker";
import { Button } from "@/components/ui/button";
import { useAddIndividualTransaction } from "@/hooks/api/use-add-individual-transaction";
import { useAuthUserId } from "@/hooks/use-auth";
import type { ExpandedAsset } from "@/types/assets";
import type { ExpandedAccount } from "@/types/account";

interface AddAssetPurchaseFormProps {
  onSuccess?: () => void;
}

export default function AddAssetPurchaseForm({
  onSuccess,
}: AddAssetPurchaseFormProps) {
  const userId = useAuthUserId();
  const addTransaction = useAddIndividualTransaction(userId);

  const [selectedDate, setSelectedDate] = useState<Date>();

  const [cashOutgoings, setCashOutgoings] = useState<{
    asset: ExpandedAsset | null;
    amount: number | string | null;
  }>({ asset: null, amount: null });
  const [cashAccount, setCashAccount] = useState<ExpandedAccount | null>(null);

  const [purchase, setPurchase] = useState<{
    asset: ExpandedAsset | null;
    amount: number | string | null;
  }>({ asset: null, amount: null });
  const [purchaseAccount, setPurchaseAccount] =
    useState<ExpandedAccount | null>(null);

  const handleSave = () => {
    if (
      !selectedDate ||
      !cashOutgoings.asset ||
      !cashOutgoings.amount ||
      !cashAccount ||
      !purchase.asset ||
      !purchase.amount ||
      !purchaseAccount
    ) {
      return;
    }

    const cashAmount = Number(cashOutgoings.amount);
    const purchaseAmount = Number(purchase.amount);
    if (isNaN(cashAmount) || isNaN(purchaseAmount)) return;

    addTransaction.mutate(
      {
        transaction: {
          type: "asset_purchase",
          date: Math.floor(selectedDate.getTime() / 1000),
          cash_outgoings_change: {
            account_id: cashAccount.id,
            amount: cashAmount,
            asset_id: cashOutgoings.asset.id,
          },
          purchase_change: {
            account_id: purchaseAccount.id,
            amount: purchaseAmount,
            asset_id: purchase.asset.id,
          },
        },
      },
      {
        onSuccess: () => onSuccess?.(),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <DateTimeLanguagePicker value={selectedDate} onChange={setSelectedDate} />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Cash Outgoings</span>
        <AccountPicker value={cashAccount} onChange={setCashAccount} />
        <AssetAmountInput
          value={cashOutgoings}
          defaultSign="negative"
          lockSign
          onAssetChange={(asset) =>
            setCashOutgoings((prev) => ({ ...prev, asset }))
          }
          onAmountChange={(amount) =>
            setCashOutgoings((prev) => ({ ...prev, amount }))
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Purchase</span>
        <AccountPicker value={purchaseAccount} onChange={setPurchaseAccount} />
        <AssetAmountInput
          value={purchase}
          defaultSign="positive"
          lockSign
          onAssetChange={(asset) =>
            setPurchase((prev) => ({ ...prev, asset }))
          }
          onAmountChange={(amount) =>
            setPurchase((prev) => ({ ...prev, amount }))
          }
        />
      </div>

      <Button onClick={handleSave} disabled={addTransaction.isPending}>
        {addTransaction.isPending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
