import { Category, CategoryType } from "@/types/category";
import { useMemo } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface CategorysState {
  categorys: Category[];
  types: CategoryType[];
  add: (categorys: Category[]) => void;
  addType: (types: CategoryType[]) => void;
}

export const useCategoryStore = create<CategorysState>((set) => ({
  categorys: [],
  types: [],
  add: (newCategorys) =>
    set((state) => ({
      ...state,
      categorys: [
        ...state.categorys,
        ...newCategorys.filter(
          (newCategory) =>
            !state.categorys.some((category) => category.id === newCategory.id),
        ),
      ],
    })),
  addType: (newTypes) =>
    set((state) => ({
      ...state,
      types: [
        ...state.types,
        ...newTypes.filter(
          (newType) => !state.types.some((type) => type.id === newType.id),
        ),
      ],
    })),
}));

export const useExpandedCategories = () => {
  const [categorys, types] = useCategoryStore(
    useShallow((state) => [state.categorys, state.types]),
  );

  return useMemo(() => {
    return categorys.map((category) => ({
      ...category,
      type: types.find((t) => t.id === category.type.id) || category.type,
    }));
  }, [categorys, types]);
};
