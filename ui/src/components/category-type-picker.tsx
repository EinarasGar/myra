import { SelectCombobox } from "./select-combobox";
import { useMemo, useState } from "react";
import { useGetCategoryTypes } from "@/hooks/api/use-user-category-api";
import {
  mapCategoryTypeComboBoxProps,
  type CategoryType,
} from "@/types/category";
import { useAuthUserId } from "@/hooks/use-auth";
import type { ComboBoxElement } from "@/interfaces/combo-box-element";

interface CategoryTypePickerProps {
  value?: CategoryType | null;
  onChange?: (categoryType: CategoryType | null) => void;
  className?: string;
}

export default function CategoryTypePicker({
  value,
  onChange,
  className,
}: CategoryTypePickerProps) {
  const userId = useAuthUserId();
  const { data: categoryTypes } = useGetCategoryTypes(userId);
  const [selectedType, setSelectedType] = useState<CategoryType | null>(
    value ?? null,
  );

  const currentValue = value ?? selectedType;

  const options = useMemo(() => {
    return (categoryTypes ?? []).map(mapCategoryTypeComboBoxProps);
  }, [categoryTypes]);

  const handleSelect = (type: (CategoryType & ComboBoxElement) | null) => {
    if (!value) {
      setSelectedType(type);
    }
    onChange?.(type);
  };

  const selectedOption = useMemo(() => {
    if (!currentValue) return null;
    return mapCategoryTypeComboBoxProps(currentValue);
  }, [currentValue]);

  return (
    <SelectCombobox
      options={options}
      placeholder="Select type..."
      value={selectedOption}
      onSelect={handleSelect}
      className={className}
    />
  );
}
