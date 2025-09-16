import { ComboBoxPopover } from "./combo-box-popover";
import { useMemo } from "react";
import { useAccountStore } from "@/hooks/store/use-account-store";
import { mapAccountComboBoxProps } from "@/types/account";
import type { Account } from "@/api";

interface AccountPickerProps {
  value?: Account | null;
  onChange?: (account: Account | null) => void;
}

export default function AccountPicker({ value, onChange }: AccountPickerProps) {
  const accounts = useAccountStore((state) => state.accounts);

  const options = useMemo(() => {
    return accounts.map(mapAccountComboBoxProps);
  }, [accounts]);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return mapAccountComboBoxProps(value);
  }, [value]);

  return (
    <div className="w-full">
      <ComboBoxPopover
        options={options}
        placeholder="Select an account..."
        value={selectedOption}
        onSelect={(selectedItem) => {
          const account = selectedItem
            ? accounts.find((a) => a.id === selectedItem.getKey())
            : null;
          onChange?.(account || null);
        }}
        onSearchValueChange={(searchValue) => {
          console.log("Search value:", searchValue);
        }}
        className="w-full"
      />
    </div>
  );
}
