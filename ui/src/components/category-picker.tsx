import { SelectCombobox } from "./select-combobox";
import { useMemo, useState } from "react";
import { useExpandedCategories } from "@/hooks/store/use-category-store";
import { useSearchGlobalCategories } from "@/hooks/api/use-get-categories";
import { useGetCategories } from "@/hooks/api/use-user-category-api";
import { mapCategoryComboBoxProps, type Category } from "@/types/category";
import { useAuthUserId } from "@/hooks/use-auth";
import useDebounce from "@/hooks/use-debounce";
import type { ComboBoxElement } from "@/interfaces/combo-box-element";

interface CategoryPickerProps {
  value?: Category | null;
  onChange?: (category: Category | null) => void;
}

export default function CategoryPicker({
  value,
  onChange,
}: CategoryPickerProps) {
  const userId = useAuthUserId();
  const categories = useExpandedCategories();
  const [searchValue, setSearchValue] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    value ?? null,
  );
  const debouncedSearchValue = useDebounce(searchValue, 500);

  // Fetch user categories
  const { isFetching: isFetchingUser } = useGetCategories(userId);

  // Fetch/search global categories
  const { isFetching: isFetchingGlobal } =
    useSearchGlobalCategories(debouncedSearchValue);

  const isFetching = isFetchingUser || isFetchingGlobal;

  const currentValue = value ?? selectedCategory;

  const options = useMemo(() => {
    return categories
      .filter((category) => !category.isSystem)
      .map(mapCategoryComboBoxProps);
  }, [categories]);

  const handleSelect = (category: (Category & ComboBoxElement) | null) => {
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
      <SelectCombobox
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
