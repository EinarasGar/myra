import { useState } from "react";
import AccountPicker from "@/components/account-picker";
import AssetAmountInput from "@/components/asset-amount-input";
import CategoryPicker from "@/components/category-picker";
import { DateTimeLanguagePicker } from "@/components/date-time-language-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAddIndividualTransaction } from "@/hooks/api/use-add-individual-transaction";
import { useAuthUserId } from "@/hooks/use-auth";
import type { ExpandedAsset } from "@/types/assets";
import type { ExpandedAccount } from "@/types/account";
import type { Category } from "@/types/category";

interface AddTransactionFormProps {
  type: string;
  onSuccess?: () => void;
}

export default function AddTransactionForm({
  type: _type,
  onSuccess,
}: AddTransactionFormProps) {
  const userId = useAuthUserId();
  const addTransaction = useAddIndividualTransaction(userId);

  const [assetAmount, setAssetAmount] = useState<{
    asset: ExpandedAsset | null;
    amount: number | string | null;
  }>({ asset: null, amount: null });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedAccount, setSelectedAccount] =
    useState<ExpandedAccount | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (
      !assetAmount.asset ||
      !assetAmount.amount ||
      !selectedDate ||
      !selectedAccount ||
      !selectedCategory
    ) {
      return;
    }

    const parsedAmount = Number(assetAmount.amount);
    if (isNaN(parsedAmount)) return;

    addTransaction.mutate(
      {
        transaction: {
          type: "regular",
          date: Math.floor(selectedDate.getTime() / 1000),
          category_id: selectedCategory.id,
          description: description || undefined,
          entry: {
            account_id: selectedAccount.id,
            asset_id: assetAmount.asset.id,
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
      <AssetAmountInput
        value={assetAmount}
        onAssetChange={(asset) =>
          setAssetAmount((prev) => ({ ...prev, asset }))
        }
        onAmountChange={(amount) =>
          setAssetAmount((prev) => ({ ...prev, amount }))
        }
      />
      <DateTimeLanguagePicker value={selectedDate} onChange={setSelectedDate} />
      <AccountPicker value={selectedAccount} onChange={setSelectedAccount} />
      <CategoryPicker value={selectedCategory} onChange={setSelectedCategory} />
      <Input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button onClick={handleSave} disabled={addTransaction.isPending}>
        {addTransaction.isPending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
