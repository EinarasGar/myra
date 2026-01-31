import { useState } from "react";
import AccountPicker from "@/components/feature/account-picker";
import AssetAmountInput from "@/components/feature/asset-amount-input";
import { DateTimeLanguagePicker } from "@/components/feature/date-time-language-picker";
import { Button } from "@/components/ui/button";
import { useAddIndividualTransaction } from "@/hooks/api/use-add-individual-transaction";
import { useAuthUserId } from "@/hooks/use-auth";
import type { ExpandedAsset } from "@/types/assets";
import type { ExpandedAccount } from "@/types/account";

interface AddAssetSaleFormProps {
  onSuccess?: () => void;
}

export default function AddAssetSaleForm({
  onSuccess,
}: AddAssetSaleFormProps) {
  const userId = useAuthUserId();
  const addTransaction = useAddIndividualTransaction(userId);

  const [selectedDate, setSelectedDate] = useState<Date>();

  const [sale, setSale] = useState<{
    asset: ExpandedAsset | null;
    amount: number | string | null;
  }>({ asset: null, amount: null });
  const [saleAccount, setSaleAccount] = useState<ExpandedAccount | null>(null);

  const [proceeds, setProceeds] = useState<{
    asset: ExpandedAsset | null;
    amount: number | string | null;
  }>({ asset: null, amount: null });
  const [proceedsAccount, setProceedsAccount] =
    useState<ExpandedAccount | null>(null);

  const handleSave = () => {
    if (
      !selectedDate ||
      !sale.asset ||
      !sale.amount ||
      !saleAccount ||
      !proceeds.asset ||
      !proceeds.amount ||
      !proceedsAccount
    ) {
      return;
    }

    const saleAmount = Number(sale.amount);
    const proceedsAmount = Number(proceeds.amount);
    if (isNaN(saleAmount) || isNaN(proceedsAmount)) return;

    addTransaction.mutate(
      {
        transaction: {
          type: "asset_sale",
          date: Math.floor(selectedDate.getTime() / 1000),
          sale_entry: {
            account_id: saleAccount.id,
            amount: saleAmount,
            asset_id: sale.asset.id,
          },
          proceeds_entry: {
            account_id: proceedsAccount.id,
            amount: proceedsAmount,
            asset_id: proceeds.asset.id,
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
        <span className="text-sm font-medium">Sale</span>
        <AccountPicker value={saleAccount} onChange={setSaleAccount} />
        <AssetAmountInput
          value={sale}
          defaultSign="negative"
          lockSign
          onAssetChange={(asset) =>
            setSale((prev) => ({ ...prev, asset }))
          }
          onAmountChange={(amount) =>
            setSale((prev) => ({ ...prev, amount }))
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Proceeds</span>
        <AccountPicker value={proceedsAccount} onChange={setProceedsAccount} />
        <AssetAmountInput
          value={proceeds}
          defaultSign="positive"
          lockSign
          onAssetChange={(asset) =>
            setProceeds((prev) => ({ ...prev, asset }))
          }
          onAmountChange={(amount) =>
            setProceeds((prev) => ({ ...prev, amount }))
          }
        />
      </div>

      <Button onClick={handleSave} disabled={addTransaction.isPending}>
        {addTransaction.isPending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
