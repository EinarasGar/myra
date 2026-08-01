import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { categoriesQueryOptions } from "@/features/categories/api"
import type { CategoryId, UserId } from "@/lib/query"

export type CategoryNames = (categoryId: CategoryId) => string | undefined

/**
 * The catalogue, not a response's lookup table: those tables are sometimes empty even when
 * rows reference a category, and a rename never propagates into a cached ledger page. Read
 * without suspense so a reference-data outage costs the ledger its category names, not its
 * rows.
 */
export function useCategoryNames(userId: UserId): CategoryNames {
  const categories = useQuery(categoriesQueryOptions(userId))
  const data = categories.data

  return useMemo(() => {
    const names = new Map<CategoryId, string>()
    for (const category of data ?? []) names.set(category.id, category.name)
    return (categoryId: CategoryId) => names.get(categoryId)
  }, [data])
}
