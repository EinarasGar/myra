import AccountPicker from "@/components/account-picker";
import AssetPicker from "@/components/asset-picker";
import CategoryPicker from "@/components/category-picker";
import { DateTimeLanguagePicker } from "@/components/date-time-language-picker";

interface AddTransactionFormProps {
  type: string;
}

export default function AddTransactionForm({
  type: _type,
}: AddTransactionFormProps) {
  return (
    <>
      <DateTimeLanguagePicker></DateTimeLanguagePicker>
      <AssetPicker></AssetPicker>
      <AccountPicker></AccountPicker>
      <CategoryPicker></CategoryPicker>
    </>
  );
}
