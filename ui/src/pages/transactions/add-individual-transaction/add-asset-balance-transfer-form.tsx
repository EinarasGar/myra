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

interface AddAssetBalanceTransferFormProps {
  onSuccess?: () => void;
  onCollect?: (transaction: TransactionInput) => void;
}

export default function AddAssetBalanceTransferForm({
  onSuccess,
  onCollect,
}: AddAssetBalanceTransferFormProps) {
  const userId = useUserId();
  const addTransaction = useAddIndividualTransaction(userId);

  const [selectedDate, setSelectedDate] = useState<Date>();

  const [outgoing, setOutgoing] = useState<{
    asset: ExpandedAsset | null;
    amount: number | string | null;
  }>({ asset: null, amount: null });
  const [outgoingAccount, setOutgoingAccount] =
    useState<ExpandedAccount | null>(null);

  const [incoming, setIncoming] = useState<{
    asset: ExpandedAsset | null;
    amount: number | string | null;
  }>({ asset: null, amount: null });
  const [incomingAccount, setIncomingAccount] =
    useState<ExpandedAccount | null>(null);

  const handleSave = () => {
    if (
      !selectedDate ||
      !outgoing.asset ||
      !outgoing.amount ||
      !outgoingAccount ||
      !incoming.asset ||
      !incoming.amount ||
      !incomingAccount
    ) {
      return;
    }

    const outgoingAmount = Number(outgoing.amount);
    const incomingAmount = Number(incoming.amount);
    if (isNaN(outgoingAmount) || isNaN(incomingAmount)) return;

    const transactionData: TransactionInput = {
      type: "asset_balance_transfer",
      date: Math.floor(selectedDate.getTime() / 1000),
      outgoing_change: {
        account_id: outgoingAccount.id,
        amount: outgoingAmount,
        asset_id: outgoing.asset.id,
      },
      incoming_change: {
        account_id: incomingAccount.id,
        amount: incomingAmount,
        asset_id: incoming.asset.id,
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
        <AssetAmountInput
          value={outgoing}
          defaultSign="negative"
          lockSign
          onAssetChange={(asset) => setOutgoing((prev) => ({ ...prev, asset }))}
          onAmountChange={(amount) =>
            setOutgoing((prev) => ({ ...prev, amount }))
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Transfer To</span>
        <AccountPicker value={incomingAccount} onChange={setIncomingAccount} />
        <AssetAmountInput
          value={incoming}
          defaultSign="positive"
          lockSign
          onAssetChange={(asset) => setIncoming((prev) => ({ ...prev, asset }))}
          onAmountChange={(amount) =>
            setIncoming((prev) => ({ ...prev, amount }))
          }
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
