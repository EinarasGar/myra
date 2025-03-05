import { Category } from "@/types/category";
import { create } from "zustand";

interface CategorysState {
  categorys: Category[];
  add: (categorys: Category[]) => void;
}

export const useCategoryStore = create<CategorysState>((set) => ({
  categorys: [],
  add: (newCategorys) =>
    set((state) => ({
      ...state,
      categorys: [
        ...state.categorys,
        ...newCategorys.filter(
          (newCategory) =>
            !state.categorys.some((category) => category.id === newCategory.id)
        ),
      ],
    })),
}));
