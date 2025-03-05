import { QueryKeys } from "@/constants/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useCategoryStore } from "../store/use-category-store";
import { Category } from "@/types/category";

export default function useGetCategories() {
  const addCategory = useCategoryStore((state) => state.add);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getCategories = async (signal?: AbortSignal): Promise<Category[]> => {
    const data = [
      {
        id: 9,
        name: "Groceries",
        icon: "shopping-cart",
        category_type: {
          id: 2,
          name: "Food",
        },
      },
      {
        id: 7,
        name: "Fast Food",
        icon: "pizza",
        category_type: {
          id: 2,
          name: "Food",
        },
      },
      {
        id: 1,
        name: "Income",
        icon: "euro",
        category_type: {
          id: 1,
          name: "Income",
        },
      },
    ];
    const mapped = data.map((data) => {
      return {
        id: data.id,
        icon: data.icon,
        name: data.name,
        type: {
          id: data.category_type.id,
          name: data.category_type.name,
        },
      } as Category;
    });
    addCategory(mapped);

    return mapped;
  };

  return useQuery({
    queryKey: [QueryKeys.CATEGORIES],
    queryFn: ({ signal }) => {
      return getCategories(signal);
    },
  });
}
