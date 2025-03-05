import { ComboBoxPopover } from "./combo-box-popover";
import { useMemo } from "react";
import { useAccountStore } from "@/hooks/store/use-account-store";
import { mapAccountComboBoxProps } from "@/types/account";

export default function AccountPicker() {
  const accounts = useAccountStore((state) => state.accounts);

  const options = useMemo(() => {
    return accounts.map(mapAccountComboBoxProps);
  }, [accounts]);

  return (
    <div className="flex items-center space-x-4">
      <p className="text-sm text-muted-foreground">Account</p>
      <ComboBoxPopover
        options={options}
        placeholder="Select an account..."
        onSelect={(selectedItem) => {
          console.log("Selected:", selectedItem);
        }}
        onSearchValueChange={(searchValue) => {
          //setSearchValue(searchValue);
          console.log("Search value:", searchValue);
        }}
        error="This is an error"
        //isFetching={isFetching}
      />
    </div>
  );
}
