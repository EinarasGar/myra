import { SelectCombobox } from "@/components/select-combobox";
import { useMemo, useState } from "react";
import { useGetAccountLiquidityTypes } from "@/hooks/api/use-user-account-api";
import type { LiquidityType } from "@/types/account";
import type { ComboBoxElement } from "@/interfaces/combo-box-element";

function mapLiquidityTypeComboBoxProps(
  type: LiquidityType,
): LiquidityType & ComboBoxElement {
  return {
    ...type,
    getLabel: () => type.name,
    getKey: () => type.id.toString(),
  };
}

interface AccountLiquidityTypePickerProps {
  value?: LiquidityType | null;
  onChange?: (liquidityType: LiquidityType | null) => void;
  className?: string;
}

export default function AccountLiquidityTypePicker({
  value,
  onChange,
  className,
}: AccountLiquidityTypePickerProps) {
  const { data: liquidityTypes } = useGetAccountLiquidityTypes();
  const [selectedType, setSelectedType] = useState<LiquidityType | null>(
    value ?? null,
  );

  const currentValue = value ?? selectedType;

  const options = useMemo(() => {
    return (liquidityTypes ?? []).map(mapLiquidityTypeComboBoxProps);
  }, [liquidityTypes]);

  const handleSelect = (type: (LiquidityType & ComboBoxElement) | null) => {
    if (!value) {
      setSelectedType(type);
    }
    onChange?.(type);
  };

  const selectedOption = useMemo(() => {
    if (!currentValue) return null;
    return mapLiquidityTypeComboBoxProps(currentValue);
  }, [currentValue]);

  return (
    <SelectCombobox
      options={options}
      placeholder="Liquidity type..."
      value={selectedOption}
      onSelect={handleSelect}
      className={className}
    />
  );
}
