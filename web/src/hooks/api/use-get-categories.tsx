import { CategoriesApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useCategoryStore } from "../store/use-category-store";
import { PaginatedResponse } from "@/types/pagination";
import { Category } from "@/types/category";

export function useSearchGlobalCategories(query?: string | null) {
  const addCategory = useCategoryStore((state) => state.add);
  const addCategoryType = useCategoryStore((state) => state.addType);

  const searchGlobalCategories = async (
    count?: number,
    start?: number,
    query?: string | null,
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Category>> => {
    const response = await CategoriesApiFactory().searchCategories(
      count,
      start,
      query || undefined,
      undefined,
      { signal },
    );

    // API returns 'results' in PageOfResults
    const categories = response.data.results.map((result) => ({
      id: result.id,
      name: result.category,
      icon: result.icon,
      isSystem: result.is_system,
      isGlobal: result.is_global,
      type: {
        id: result.category_type,
        name:
          response.data.lookup_tables.category_types.find(
            (type) => type.id === result.category_type,
          )?.name || "",
      },
    }));

    addCategory(categories);
    addCategoryType(
      response.data.lookup_tables.category_types.map((type) => ({
        id: type.id,
        name: type.name,
      })),
    );

    return {
      totalCount: response.data.total_results,
      data: categories,
    };
  };

  return useQuery({
    queryKey: [QueryKeys.GLOBAL_CATEGORIES, query],
    queryFn: ({ signal }) => searchGlobalCategories(20, 0, query, signal),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
