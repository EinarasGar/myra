import { useState } from "react";
import AccountPicker from "@/components/feature/account-picker";
import AssetAmountInput from "@/components/feature/asset-amount-input";
import { DateTimeLanguagePicker } from "@/components/feature/date-time-language-picker";
import { Button } from "@/components/ui/button";
import { useAddIndividualTransaction } from "@/hooks/api/use-add-individual-transaction";
import { useUserId } from "@/hooks/use-auth";
import type { ExpandedAsset } from "@/types/assets";
import type { ExpandedAccount } from "@/types/account";
import type { TransactionInput } from "@/api";

interface AddCashBalanceTransferFormProps {
  onSuccess?: () => void;
  onCollect?: (transaction: TransactionInput) => void;
}

export default function AddCashBalanceTransferForm({
  onSuccess,
  onCollect,
}: AddCashBalanceTransferFormProps) {
  const userId = useUserId();
  const addTransaction = useAddIndividualTransaction(userId);

  const [selectedDate, setSelectedDate] = useState<Date>();

  const [entry, setEntry] = useState<{
    asset: ExpandedAsset | null;
    amount: number | string | null;
  }>({ asset: null, amount: null });
  const [outgoingAccount, setOutgoingAccount] =
    useState<ExpandedAccount | null>(null);
  const [incomingAccount, setIncomingAccount] =
    useState<ExpandedAccount | null>(null);

  const handleSave = () => {
    if (
      !selectedDate ||
      !entry.asset ||
      !entry.amount ||
      !outgoingAccount ||
      !incomingAccount ||
      outgoingAccount.id === incomingAccount.id
    ) {
      return;
    }

    const parsedAmount = Number(entry.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const transactionData: TransactionInput = {
      type: "cash_balance_transfer",
      date: Math.floor(selectedDate.getTime() / 1000),
      outgoing_change: {
        account_id: outgoingAccount.id,
        asset_id: entry.asset.id,
        amount: -parsedAmount,
      },
      incoming_change: {
        account_id: incomingAccount.id,
        asset_id: entry.asset.id,
        amount: parsedAmount,
      },
    };

    if (onCollect) {
      onCollect(transactionData);
      return;
    }

    addTransaction.mutate(
      { transaction: transactionData },
      { onSuccess: () => onSuccess?.() },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <DateTimeLanguagePicker value={selectedDate} onChange={setSelectedDate} />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Transfer From</span>
        <AccountPicker value={outgoingAccount} onChange={setOutgoingAccount} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Transfer To</span>
        <AccountPicker value={incomingAccount} onChange={setIncomingAccount} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Amount</span>
        <AssetAmountInput
          value={entry}
          defaultSign="positive"
          lockSign
          onAssetChange={(asset) => setEntry((prev) => ({ ...prev, asset }))}
          onAmountChange={(amount) => setEntry((prev) => ({ ...prev, amount }))}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={!onCollect && addTransaction.isPending}
      >
        {onCollect
          ? "Add to Group"
          : addTransaction.isPending
            ? "Saving..."
            : "Save"}
      </Button>
    </div>
  );
}
