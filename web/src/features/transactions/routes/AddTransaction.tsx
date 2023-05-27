import { AssetAutoComplete } from "@/features/asset";
import CategoryAutoComplete from "../components/CategoryAutoComplete";
import { AccountsAutoComplete } from "@/features/accounts";

function AddTransaction() {
  return (
    <>
      <CategoryAutoComplete />
      <AssetAutoComplete />
      <AccountsAutoComplete />
      <AccountsAutoComplete />
    </>
  );
}

export default AddTransaction;
