import { SelectCombobox } from "./select-combobox";
import { useMemo, useState } from "react";
import { useGetAccountTypes } from "@/hooks/api/use-user-account-api";
import type { AccountType } from "@/types/account";
import type { ComboBoxElement } from "@/interfaces/combo-box-element";

function mapAccountTypeComboBoxProps(
  type: AccountType,
): AccountType & ComboBoxElement {
  return {
    ...type,
    getLabel: () => type.name,
    getKey: () => type.id.toString(),
  };
}

interface AccountTypePickerProps {
  value?: AccountType | null;
  onChange?: (accountType: AccountType | null) => void;
  className?: string;
}

export default function AccountTypePicker({
  value,
  onChange,
  className,
}: AccountTypePickerProps) {
  const { data: accountTypes } = useGetAccountTypes();
  const [selectedType, setSelectedType] = useState<AccountType | null>(
    value ?? null,
  );

  const currentValue = value ?? selectedType;

  const options = useMemo(() => {
    return (accountTypes ?? []).map(mapAccountTypeComboBoxProps);
  }, [accountTypes]);

  const handleSelect = (type: (AccountType & ComboBoxElement) | null) => {
    if (!value) {
      setSelectedType(type);
    }
    onChange?.(type);
  };

  const selectedOption = useMemo(() => {
    if (!currentValue) return null;
    return mapAccountTypeComboBoxProps(currentValue);
  }, [currentValue]);

  return (
    <SelectCombobox
      options={options}
      placeholder="Account type..."
      value={selectedOption}
      onSelect={handleSelect}
      className={className}
    />
  );
}
