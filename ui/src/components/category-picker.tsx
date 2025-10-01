import { ComboBoxPopover } from "./combo-box-popover";
import { useMemo, useState } from "react";
import { useExpandedCategories } from "@/hooks/store/use-category-store";
import useSearchCategories from "@/hooks/api/use-get-categories";
import { mapCategoryComboBoxProps } from "@/types/category";
import type { TransactionCategory } from "@/types/categories";
import { useAuthUserId } from "@/hooks/use-auth";
import useDebounce from "@/hooks/use-debounce";
import type { ComboBoxElement } from "@/interfaces/combo-box-element";

interface CategoryPickerProps {
  value?: TransactionCategory | null;
  onChange?: (category: TransactionCategory | null) => void;
}

export default function CategoryPicker({
  value,
  onChange,
}: CategoryPickerProps) {
  const userId = useAuthUserId();
  const categories = useExpandedCategories();
  const [searchValue, setSearchValue] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<TransactionCategory | null>(value ?? null);
  const debouncedSearchValue = useDebounce(searchValue, 500);
  const { isFetching } = useSearchCategories(userId, debouncedSearchValue);

  const currentValue = value ?? selectedCategory;

  const options = useMemo(() => {
    return categories
      .filter((category) => !category.isSystem)
      .map(mapCategoryComboBoxProps);
  }, [categories]);

  const handleSelect = (
    category: (TransactionCategory & ComboBoxElement) | null,
  ) => {
    if (!value) {
      setSelectedCategory(category);
    }
    onChange?.(category);
  };

  const selectedOption = useMemo(() => {
    if (!currentValue) return null;
    return mapCategoryComboBoxProps(currentValue);
  }, [currentValue]);

  return (
    <div className="w-full">
      <ComboBoxPopover
        options={options}
        placeholder="Select a category..."
        value={selectedOption}
        onSelect={handleSelect}
        onSearchValueChange={(searchValue) => {
          setSearchValue(searchValue);
        }}
        isFetching={isFetching}
        className="w-full"
      />
    </div>
  );
}
