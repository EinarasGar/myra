import { useState } from "react";
import AccountPicker from "@/components/feature/account-picker";
import AssetAmountInput from "@/components/feature/asset-amount-input";
import { DateTimeLanguagePicker } from "@/components/feature/date-time-language-picker";
import { Button } from "@/components/ui/button";
import { useAddIndividualTransaction } from "@/hooks/api/use-add-individual-transaction";
import { useAuthUserId } from "@/hooks/use-auth";
import type { ExpandedAsset } from "@/types/assets";
import type { ExpandedAccount } from "@/types/account";

interface AddAssetDividendFormProps {
  onSuccess?: () => void;
}

export default function AddAssetDividendForm({
  onSuccess,
}: AddAssetDividendFormProps) {
  const userId = useAuthUserId();
  const addTransaction = useAddIndividualTransaction(userId);

  const [selectedDate, setSelectedDate] = useState<Date>();

  const [entry, setEntry] = useState<{
    asset: ExpandedAsset | null;
    amount: number | string | null;
  }>({ asset: null, amount: null });
  const [entryAccount, setEntryAccount] = useState<ExpandedAccount | null>(
    null,
  );

  const handleSave = () => {
    if (!selectedDate || !entry.asset || !entry.amount || !entryAccount) {
      return;
    }

    const parsedAmount = Number(entry.amount);
    if (isNaN(parsedAmount)) return;

    addTransaction.mutate(
      {
        transaction: {
          type: "asset_dividend",
          date: Math.floor(selectedDate.getTime() / 1000),
          entry: {
            account_id: entryAccount.id,
            asset_id: entry.asset.id,
            amount: parsedAmount,
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
        <span className="text-sm font-medium">Entry</span>
        <AccountPicker value={entryAccount} onChange={setEntryAccount} />
        <AssetAmountInput
          value={entry}
          defaultSign="positive"
          lockSign
          onAssetChange={(asset) =>
            setEntry((prev) => ({ ...prev, asset }))
          }
          onAmountChange={(amount) =>
            setEntry((prev) => ({ ...prev, amount }))
          }
        />
      </div>

      <Button onClick={handleSave} disabled={addTransaction.isPending}>
        {addTransaction.isPending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
