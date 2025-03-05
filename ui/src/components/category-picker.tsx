import { ComboBoxPopover } from "./combo-box-popover";
import { useMemo } from "react";
import { useCategoryStore } from "@/hooks/store/use-category-store";
import useGetCategories from "@/hooks/api/use-get-categories";
import { mapCategoryComboBoxProps } from "@/types/category";

export default function CategoryPicker() {
  const categories = useCategoryStore((state) => state.categorys);
  const { isFetching } = useGetCategories();

  const options = useMemo(() => {
    return categories.map(mapCategoryComboBoxProps);
  }, [categories]);

  return (
    <div className="flex items-center space-x-4">
      <p className="text-sm text-muted-foreground">Categories</p>
      <ComboBoxPopover
        options={options}
        placeholder="Select a category..."
        onSelect={(selectedItem) => {
          console.log("Selected:", selectedItem);
        }}
        isFetching={isFetching}
      />
    </div>
  );
}
