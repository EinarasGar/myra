import { SelectCombobox } from "./select-combobox";
import { useMemo, useState } from "react";
import { useExpandedAccounts } from "@/hooks/store/use-account-store";
import useGetAccounts from "@/hooks/api/use-get-accounts";
import { mapAccountComboBoxProps } from "@/types/account";
import type { ExpandedAccount } from "@/types/account";
import type { ComboBoxElement } from "@/interfaces/combo-box-element";
import { useAuthUserId } from "@/hooks/use-auth";

interface AccountPickerProps {
  value?: ExpandedAccount | null;
  onChange?: (account: ExpandedAccount | null) => void;
}

export default function AccountPicker({ value, onChange }: AccountPickerProps) {
  const userId = useAuthUserId();
  const accounts = useExpandedAccounts();
  const [selectedAccount, setSelectedAccount] =
    useState<ExpandedAccount | null>(value ?? null);
  const { isFetching } = useGetAccounts(userId);

  const currentValue = value ?? selectedAccount;

  const options = useMemo(() => {
    return accounts.map(mapAccountComboBoxProps);
  }, [accounts]);

  const handleSelect = (
    account: (ExpandedAccount & ComboBoxElement) | null,
  ) => {
    if (!value) {
      setSelectedAccount(account);
    }
    onChange?.(account);
  };

  const selectedOption = useMemo(() => {
    if (!currentValue) return null;
    return mapAccountComboBoxProps(currentValue);
  }, [currentValue]);

  return (
    <div className="w-full">
      <SelectCombobox
        options={options}
        placeholder="Select an account..."
        value={selectedOption}
        onSelect={handleSelect}
        onSearchValueChange={(searchValue) => {
          console.log("Search value:", searchValue);
        }}
        isFetching={isFetching}
        className="w-full"
      />
    </div>
  );
}
