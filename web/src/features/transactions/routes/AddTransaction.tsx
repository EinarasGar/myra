import { AssetAutoComplete } from "@/features/asset";
import CategoryAutoComplete from "../components/CategoryAutoComplete";

function AddTransaction() {
  return (
    <>
      <CategoryAutoComplete />
      <AssetAutoComplete />
    </>
  );
}

export default AddTransaction;
