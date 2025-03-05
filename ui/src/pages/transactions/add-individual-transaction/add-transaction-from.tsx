import AccountPicker from "@/components/account-picker";
import AssetPicker from "@/components/asset-picker";
import CategoryPicker from "@/components/category-picker";

interface AddTransactionFormProps {
  type: string;
}

export default function AddTransactionForm({ type }: AddTransactionFormProps) {
  return (
    <>
      <AssetPicker></AssetPicker>
      <AccountPicker></AccountPicker>
      <CategoryPicker></CategoryPicker>
    </>
  );
}
