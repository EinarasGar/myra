import { useSuspenseQueries } from "@tanstack/react-query"
import { useMemo } from "react"

import type { CategoryMetadataLookupTables } from "@/api"
import { CategoriesApiFactory, UserCategoriesApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { Category } from "@/lib/domain/refs"
import { toCategory } from "@/lib/domain/refs"
import type { UserId } from "@/lib/query"
import { apiQueryOptions, queryKeys, STALE_TIMES } from "@/lib/query"

import type { CategoryCatalogue, CategoryType } from "./types"
import { buildCategoryCatalogue } from "./types"

export const CATEGORY_SWEEP_PAGE_SIZE = 100

const MAX_CATEGORY_SWEEP_PAGES = 50

export function toCategoryTypes(
  lookup: CategoryMetadataLookupTables
): CategoryType[] {
  return lookup.category_types.map((type) => ({
    id: type.id,
    name: type.name,
    isGlobal: type.is_global,
  }))
}

/**
 * `GET /api/categories` is global-only — it filters `user_id IS NULL` — and it
 * is paged with no all-in-one variant. `total_results` is the stop condition;
 * the page cap guards against a wrong total spinning forever.
 */
async function sweepGlobalCategories(signal: AbortSignal): Promise<Category[]> {
  const collected: Category[] = []
  let start = 0

  for (let page = 0; page < MAX_CATEGORY_SWEEP_PAGES; page += 1) {
    const response = await api(CategoriesApiFactory).searchCategories(
      CATEGORY_SWEEP_PAGE_SIZE,
      start,
      undefined,
      undefined,
      { signal }
    )
    const { results, total_results: total } = response.data
    collected.push(...results.map(toCategory))
    start += results.length
    if (results.length === 0 || start >= total) break
  }

  return collected
}

/** `GET /api/users/{id}/categories` is custom-only and unpaged. */
async function fetchUserCategories(
  userId: UserId,
  signal: AbortSignal
): Promise<Category[]> {
  const response = await api(UserCategoriesApiFactory).getCategories(userId, {
    signal,
  })
  return response.data.categories.map(toCategory)
}

/**
 * The two category routes return disjoint sets — globals on `/api/categories`,
 * the caller's own on `/api/users/{id}/categories` — so the catalogue is only
 * complete when both are fetched and merged.
 */
export function categoriesQueryOptions(userId: UserId) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).categories.all(),
    staleTime: STALE_TIMES.reference,
    fetch: async ({ signal }): Promise<Category[]> => {
      const [global, custom] = await Promise.all([
        sweepGlobalCategories(signal),
        fetchUserCategories(userId, signal),
      ])
      return [...global, ...custom]
    },
    meta: { errorContext: "Categories could not be loaded" },
  })
}

export function categoryTypesQueryOptions(userId: UserId) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).categories.types(),
    staleTime: STALE_TIMES.reference,
    fetch: async ({ signal }): Promise<CategoryType[]> => {
      const response = await api(UserCategoriesApiFactory).getUserCategoryTypes(
        userId,
        { signal }
      )
      return toCategoryTypes(response.data)
    },
    meta: { errorContext: "Category types could not be loaded" },
  })
}

export function categoryQueryOptions(userId: UserId, categoryId: number) {
  return apiQueryOptions({
    queryKey: queryKeys.user(userId).categories.detail(categoryId),
    staleTime: STALE_TIMES.reference,
    fetch: async ({ signal }): Promise<Category> => {
      const response = await api(UserCategoriesApiFactory).getUserCategory(
        userId,
        categoryId,
        { signal }
      )
      const { data } = response
      return {
        id: categoryId,
        name: data.category,
        icon: data.icon,
        typeId: data.category_type.id,
        isGlobal: data.is_global,
        isSystem: data.is_system,
      }
    },
    meta: { errorContext: "Category could not be loaded" },
  })
}

export function useCategoryCatalogue(userId: UserId): CategoryCatalogue {
  const [categories, types] = useSuspenseQueries({
    queries: [
      categoriesQueryOptions(userId),
      categoryTypesQueryOptions(userId),
    ],
  })

  return useMemo(
    () => buildCategoryCatalogue(categories.data, types.data),
    [categories.data, types.data]
  )
}

export interface CategoryLookup {
  readonly catalogue: CategoryCatalogue
  readonly category: (id: number | null | undefined) => Category | undefined
  readonly name: (id: number | null | undefined) => string | undefined
  readonly typeName: (id: number | null | undefined) => string | undefined
}

export function useCategoryLookup(userId: UserId): CategoryLookup {
  const catalogue = useCategoryCatalogue(userId)

  return useMemo(() => {
    const category = (id: number | null | undefined) =>
      id === null || id === undefined ? undefined : catalogue.byId.get(id)
    return {
      catalogue,
      category,
      name: (id) => category(id)?.name,
      typeName: (id) => {
        const found = category(id)
        return found === undefined
          ? undefined
          : catalogue.typeById.get(found.typeId)?.name
      },
    }
  }, [catalogue])
}
