import { CategoriesApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useCategoryStore } from "../store/use-category-store";
import { PaginatedResponse } from "@/types/pagination";
import { Category } from "@/types/category";

export default function useSearchCategories(
  userId: string,
  query?: string | null,
) {
  const addCategory = useCategoryStore((state) => state.add);
  const addCategoryType = useCategoryStore((state) => state.addType);

  const searchCategories = async (
    userId: string,
    count?: number,
    start?: number,
    query?: string | null,
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Category>> => {
    const data = await CategoriesApiFactory().searchCategories(
      userId,
      count,
      start,
      query || undefined,
      undefined,
      { signal },
    );

    const categories = data.data.results.map((result) => ({
      id: result.id,
      name: result.category,
      icon: result.icon,
      isSystem: result.is_system,
      isGlobal: result.is_global,
      type: {
        id: result.category_type,
        name:
          data.data.lookup_tables.category_types.find(
            (type) => type.id === result.category_type,
          )?.name || "",
      },
    }));

    addCategory(categories);
    addCategoryType(
      data.data.lookup_tables.category_types.map((type) => ({
        id: type.id,
        name: type.name,
      })),
    );

    return {
      totalCount: data.data.total_results,
      data: categories,
    };
  };

  return useQuery({
    queryKey: [QueryKeys.CATEGORIES, userId, query],
    queryFn: ({ signal }) => {
      return searchCategories(userId, 20, 0, query, signal);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
