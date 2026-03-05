import { useState } from "react";
import AccountPicker from "@/components/feature/account-picker";
import AssetAmountInput from "@/components/feature/asset-amount-input";
import { DateTimeLanguagePicker } from "@/components/feature/date-time-language-picker";
import { Button } from "@/components/ui/button";
import { useAddIndividualTransaction } from "@/hooks/api/use-add-individual-transaction";
import { useAuthUserId } from "@/hooks/use-auth";
import type { ExpandedAsset } from "@/types/assets";
import type { ExpandedAccount } from "@/types/account";

interface AddAssetTradeFormProps {
  onSuccess?: () => void;
}

export default function AddAssetTradeForm({
  onSuccess,
}: AddAssetTradeFormProps) {
  const userId = useAuthUserId();
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

    addTransaction.mutate(
      {
        transaction: {
          type: "asset_trade",
          date: Math.floor(selectedDate.getTime() / 1000),
          outgoing_entry: {
            account_id: outgoingAccount.id,
            amount: outgoingAmount,
            asset_id: outgoing.asset.id,
          },
          incoming_entry: {
            account_id: incomingAccount.id,
            amount: incomingAmount,
            asset_id: incoming.asset.id,
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
        <span className="text-sm font-medium">Outgoing Asset</span>
        <AccountPicker value={outgoingAccount} onChange={setOutgoingAccount} />
        <AssetAmountInput
          value={outgoing}
          defaultSign="negative"
          lockSign
          onAssetChange={(asset) =>
            setOutgoing((prev) => ({ ...prev, asset }))
          }
          onAmountChange={(amount) =>
            setOutgoing((prev) => ({ ...prev, amount }))
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Incoming Asset</span>
        <AccountPicker value={incomingAccount} onChange={setIncomingAccount} />
        <AssetAmountInput
          value={incoming}
          defaultSign="positive"
          lockSign
          onAssetChange={(asset) =>
            setIncoming((prev) => ({ ...prev, asset }))
          }
          onAmountChange={(amount) =>
            setIncoming((prev) => ({ ...prev, amount }))
          }
        />
      </div>

      <Button onClick={handleSave} disabled={addTransaction.isPending}>
        {addTransaction.isPending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
