import { ComboBoxPopover } from "./combo-box-popover";
import { useMemo } from "react";
import { useCategoryStore } from "@/hooks/store/use-category-store";
import useGetCategories from "@/hooks/api/use-get-categories";
import { mapCategoryComboBoxProps } from "@/types/category";
import type { TransactionCategory } from "@/types/categories";

interface CategoryPickerProps {
  value?: TransactionCategory | null;
  onChange?: (category: TransactionCategory | null) => void;
}

export default function CategoryPicker({
  value,
  onChange,
}: CategoryPickerProps) {
  const categories = useCategoryStore((state) => state.categorys);
  const { isFetching } = useGetCategories();

  const options = useMemo(() => {
    return categories.map(mapCategoryComboBoxProps);
  }, [categories]);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return mapCategoryComboBoxProps(value);
  }, [value]);

  return (
    <div className="w-full">
      <ComboBoxPopover
        options={options}
        placeholder="Select a category..."
        value={selectedOption}
        onSelect={(selectedItem) => {
          const category = selectedItem
            ? categories.find((c) => c.id === selectedItem.getKey())
            : null;
          onChange?.(category || null);
        }}
        isFetching={isFetching}
        className="w-full"
      />
    </div>
  );
}
