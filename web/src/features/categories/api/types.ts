import type { Category } from "@/lib/domain/refs"
import type { CategoryId, CategoryTypeId } from "@/lib/query"

export interface CategoryType {
  readonly id: CategoryTypeId
  readonly name: string
  readonly isGlobal: boolean
}

export interface CategoryTypeGroup {
  readonly type: CategoryType
  readonly categories: readonly Category[]
  readonly categoryCount: number
  readonly customCategoryCount: number
}

export interface CategoryCatalogue {
  readonly categories: readonly Category[]
  readonly types: readonly CategoryType[]
  readonly groups: readonly CategoryTypeGroup[]
  readonly byId: ReadonlyMap<CategoryId, Category>
  readonly typeById: ReadonlyMap<CategoryTypeId, CategoryType>
  readonly totalCategories: number
  readonly totalTypes: number
  readonly customCategories: number
  readonly customTypes: number
}

/**
 * Placeholder id carried by an optimistically inserted row until the server
 * assigns a real one. Never send it back to the API.
 */
export const PENDING_CATEGORY_ID = -1

export function isPendingCategory(category: {
  id: CategoryId | CategoryTypeId
}): boolean {
  return category.id === PENDING_CATEGORY_ID
}

export function isEditableCategory(category: Category): boolean {
  return !category.isGlobal && !category.isSystem
}

export function isEditableCategoryType(type: CategoryType): boolean {
  return !type.isGlobal
}

export const EMPTY_CATEGORY_CATALOGUE: CategoryCatalogue = {
  categories: [],
  types: [],
  groups: [],
  byId: new Map(),
  typeById: new Map(),
  totalCategories: 0,
  totalTypes: 0,
  customCategories: 0,
  customTypes: 0,
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name)
}

/**
 * `incoming` is the concatenation of the global route and the user route, hence
 * the dedupe. Neither route returns a type that has no categories,
 * so the type list has to come from `GET /users/{id}/categories/types` and be
 * merged in — otherwise an empty type disappears from settings.
 */
export function buildCategoryCatalogue(
  incoming: readonly Category[],
  types: readonly CategoryType[]
): CategoryCatalogue {
  const typeById = new Map<CategoryTypeId, CategoryType>()
  for (const type of types) typeById.set(type.id, type)

  const categories: Category[] = []
  const byId = new Map<CategoryId, Category>()
  const byType = new Map<CategoryTypeId, Category[]>()
  for (const category of incoming) {
    if (!isPendingCategory(category) && byId.has(category.id)) continue

    categories.push(category)
    byId.set(category.id, category)
    const bucket = byType.get(category.typeId)
    if (bucket === undefined) byType.set(category.typeId, [category])
    else bucket.push(category)

    if (!typeById.has(category.typeId)) {
      typeById.set(category.typeId, {
        id: category.typeId,
        name: "",
        isGlobal: category.isGlobal,
      })
    }
  }

  const orderedTypes = [...typeById.values()].sort(byName)
  const groups = orderedTypes.map((type): CategoryTypeGroup => {
    const members = (byType.get(type.id) ?? []).slice().sort(byName)
    return {
      type,
      categories: members,
      categoryCount: members.length,
      customCategoryCount: members.filter((category) => !category.isGlobal)
        .length,
    }
  })

  return {
    categories: categories.slice().sort(byName),
    types: orderedTypes,
    groups,
    byId,
    typeById,
    totalCategories: categories.length,
    totalTypes: orderedTypes.length,
    customCategories: categories.filter((category) => !category.isGlobal)
      .length,
    customTypes: orderedTypes.filter((type) => !type.isGlobal).length,
  }
}

export function filterCategories(
  catalogue: CategoryCatalogue,
  query: string
): readonly Category[] {
  const needle = query.trim().toLocaleLowerCase()
  if (needle === "") return catalogue.categories
  return catalogue.categories.filter((category) => {
    if (category.name.toLocaleLowerCase().includes(needle)) return true
    const type = catalogue.typeById.get(category.typeId)
    return type !== undefined && type.name.toLocaleLowerCase().includes(needle)
  })
}
