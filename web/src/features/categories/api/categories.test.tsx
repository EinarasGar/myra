import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CategoriesApiFactory } from "@/api"
import { queryKeys } from "@/lib/query"

const stubs = vi.hoisted(() => ({
  searchCategories: vi.fn(),
  getCategories: vi.fn(),
  getUserCategoryTypes: vi.fn(),
  postUserCategory: vi.fn(),
  putUserCategory: vi.fn(),
  deleteUserCategory: vi.fn(),
  postUserCategoryType: vi.fn(),
  putUserCategoryType: vi.fn(),
  deleteUserCategoryType: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  api: (factory: unknown) => {
    if (factory === CategoriesApiFactory) {
      return { searchCategories: stubs.searchCategories }
    }
    return {
      getCategories: stubs.getCategories,
      getUserCategoryTypes: stubs.getUserCategoryTypes,
      postUserCategory: stubs.postUserCategory,
      putUserCategory: stubs.putUserCategory,
      deleteUserCategory: stubs.deleteUserCategory,
      postUserCategoryType: stubs.postUserCategoryType,
      putUserCategoryType: stubs.putUserCategoryType,
      deleteUserCategoryType: stubs.deleteUserCategoryType,
    }
  },
  apiClient: { get: vi.fn() },
}))

const {
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
  useUpdateCategoryType,
} = await import("./mutations")
const { categoriesQueryOptions, categoryTypesQueryOptions } =
  await import("./queries")
const { toCategory } = await import("@/lib/domain/refs")
const { buildCategoryCatalogue, filterCategories, PENDING_CATEGORY_ID } =
  await import("./types")
const { categoryFormSchema, categoryTypeFormSchema } = await import("./schemas")

const USER = "00000000-0000-0000-0000-000000000000"

function wireCategory(id: number, name: string, typeId: number, global = true) {
  return {
    id,
    category: name,
    icon: "circle",
    category_type: typeId,
    is_global: global,
    is_system: global,
  }
}

function category(id: number, name: string, typeId: number, global = true) {
  return toCategory(wireCategory(id, name, typeId, global))
}

function globalPage(
  results: ReturnType<typeof wireCategory>[],
  total = results.length
) {
  return {
    data: {
      results,
      total_results: total,
      lookup_tables: { category_types: [] },
    },
  }
}

function userCategories(categories: ReturnType<typeof wireCategory>[] = []) {
  return {
    data: { categories, lookup_tables: { category_types: [] } },
  }
}

function runQuery<T>(options: { queryFn?: unknown }): Promise<T> {
  const queryFn = options.queryFn as (context: {
    signal: AbortSignal
  }) => Promise<T>
  return queryFn({ signal: new AbortController().signal })
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function testClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubs.getCategories.mockResolvedValue(userCategories())
})

describe("buildCategoryCatalogue", () => {
  const groceries = category(1, "Groceries", 10)
  const coffee = category(2, "Cafes & coffee", 10)
  const dog = category(3, "Dog things", 10, false)
  const etfs = category(4, "ETFs", 20)
  const types = [
    { id: 10, name: "Everyday", isGlobal: true },
    { id: 20, name: "Investments", isGlobal: true },
    { id: 30, name: "Sabbatical 2027", isGlobal: false },
  ]

  it("groups categories under their type and counts them", () => {
    const catalogue = buildCategoryCatalogue(
      [groceries, coffee, dog, etfs],
      types
    )
    const everyday = catalogue.groups.find((group) => group.type.id === 10)
    expect(everyday?.categoryCount).toBe(3)
    expect(everyday?.customCategoryCount).toBe(1)
    expect(everyday?.categories.map((entry) => entry.name)).toEqual([
      "Cafes & coffee",
      "Dog things",
      "Groceries",
    ])
  })

  it("keeps a type that has no categories, which the sweep alone would drop", () => {
    const catalogue = buildCategoryCatalogue([groceries], types)
    const sabbatical = catalogue.groups.find((group) => group.type.id === 30)
    expect(sabbatical).toBeDefined()
    expect(sabbatical?.categoryCount).toBe(0)
    expect(catalogue.totalTypes).toBe(3)
  })

  it("counts customs for the settings fold", () => {
    const catalogue = buildCategoryCatalogue(
      [groceries, coffee, dog, etfs],
      types
    )
    expect(catalogue.totalCategories).toBe(4)
    expect(catalogue.customCategories).toBe(1)
    expect(catalogue.customTypes).toBe(1)
  })

  it("synthesises a placeholder type rather than losing a category", () => {
    const orphan = category(9, "Orphan", 99)
    const catalogue = buildCategoryCatalogue([orphan], types)
    expect(catalogue.typeById.has(99)).toBe(true)
    expect(catalogue.byId.get(9)).toEqual(orphan)
  })

  it("dedupes an id that arrives from both routes", () => {
    const catalogue = buildCategoryCatalogue([groceries, groceries, dog], types)
    expect(catalogue.totalCategories).toBe(2)
    expect(catalogue.customCategories).toBe(1)
    expect(
      catalogue.groups.find((group) => group.type.id === 10)?.categoryCount
    ).toBe(2)
  })

  it("keeps every pending row, which all share the placeholder id", () => {
    const first = { ...dog, id: PENDING_CATEGORY_ID, name: "Dog things" }
    const second = { ...dog, id: PENDING_CATEGORY_ID, name: "Cat things" }
    const catalogue = buildCategoryCatalogue([groceries, first, second], types)
    expect(catalogue.totalCategories).toBe(3)
  })

  it("indexes every category by id", () => {
    const catalogue = buildCategoryCatalogue([groceries, etfs], types)
    expect(catalogue.byId.get(4)?.name).toBe("ETFs")
    expect(catalogue.byId.get(999)).toBeUndefined()
  })

  it("filters by category name and by type name", () => {
    const catalogue = buildCategoryCatalogue(
      [groceries, coffee, dog, etfs],
      types
    )
    expect(filterCategories(catalogue, "cof").map((c) => c.name)).toEqual([
      "Cafes & coffee",
    ])
    expect(filterCategories(catalogue, "invest").map((c) => c.name)).toEqual([
      "ETFs",
    ])
    expect(filterCategories(catalogue, "  ")).toHaveLength(4)
  })
})

describe("category sweep", () => {
  it("pages the global route until total_results is reached", async () => {
    stubs.searchCategories
      .mockResolvedValueOnce(
        globalPage([wireCategory(1, "A", 10), wireCategory(2, "B", 10)], 3)
      )
      .mockResolvedValueOnce(globalPage([wireCategory(3, "C", 20)], 3))

    const result = await runQuery<ReturnType<typeof toCategory>[]>(
      categoriesQueryOptions(USER)
    )
    expect(result).toHaveLength(3)
    expect(stubs.searchCategories).toHaveBeenCalledTimes(2)
    expect(stubs.searchCategories.mock.calls[1]?.[1]).toBe(2)
  })

  it("merges the user's own categories, which the global route never returns", async () => {
    stubs.searchCategories.mockResolvedValue(
      globalPage([wireCategory(1, "Groceries", 10)])
    )
    stubs.getCategories.mockResolvedValue(
      userCategories([wireCategory(50, "Dog things", 10, false)])
    )

    const result = await runQuery<ReturnType<typeof toCategory>[]>(
      categoriesQueryOptions(USER)
    )
    expect(result.map((entry) => entry.id)).toEqual([1, 50])
    expect(result.find((entry) => entry.id === 50)?.isGlobal).toBe(false)
    expect(stubs.getCategories).toHaveBeenCalledTimes(1)
    expect(stubs.getCategories.mock.calls[0]?.[0]).toBe(USER)
  })

  it("stops on an empty page even when the total lies", async () => {
    stubs.searchCategories.mockResolvedValue(globalPage([], 500))
    const result = await runQuery(categoriesQueryOptions(USER))
    expect(result).toEqual([])
    expect(stubs.searchCategories).toHaveBeenCalledTimes(1)
  })

  it("caps the sweep when the server never reaches its own total", async () => {
    stubs.searchCategories.mockResolvedValue(
      globalPage([wireCategory(1, "A", 10)], Number.MAX_SAFE_INTEGER)
    )
    await runQuery(categoriesQueryOptions(USER))
    expect(stubs.searchCategories.mock.calls.length).toBeLessThanOrEqual(50)
  })

  it("is keyed under the user because half the catalogue is user-scoped", () => {
    expect(categoriesQueryOptions(USER).queryKey).toEqual(
      queryKeys.user(USER).categories.all()
    )
    expect(categoryTypesQueryOptions(USER).queryKey).toEqual(
      queryKeys.user(USER).categories.types()
    )
  })
})

describe("category mutations", () => {
  it("appends a pending row, then settles on the server's", async () => {
    const client = testClient()
    client.setQueryData(queryKeys.user(USER).categories.all(), [
      category(1, "Groceries", 10),
    ])
    stubs.postUserCategory.mockResolvedValue({
      data: {
        id: 7,
        category: "Dog things",
        icon: "dog",
        category_type: { id: 10, name: "Everyday", is_global: true },
        is_global: false,
        is_system: false,
      },
    })

    const { result } = renderHook(() => useCreateCategory(USER), {
      wrapper: wrapper(client),
    })
    result.current.mutate({
      body: { category: "Dog things", icon: "dog", category_type_id: 10 },
    })

    await waitFor(() => {
      expect(
        client.getQueryData(queryKeys.user(USER).categories.all())
      ).toHaveLength(2)
    })
    const optimistic = client.getQueryData<{ id: number }[]>(
      queryKeys.user(USER).categories.all()
    )
    expect(optimistic?.[1]?.id).toBe(PENDING_CATEGORY_ID)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("keeps a created category through the settling refetch", async () => {
    const client = testClient()
    stubs.searchCategories.mockResolvedValue(
      globalPage([wireCategory(1, "Groceries", 10)])
    )
    stubs.postUserCategory.mockResolvedValue({
      data: {
        id: 7,
        category: "Dog things",
        icon: "dog",
        category_type: { id: 10, name: "Everyday", is_global: true },
        is_global: false,
        is_system: false,
      },
    })

    const { result } = renderHook(
      () => ({
        list: useQuery(categoriesQueryOptions(USER)),
        create: useCreateCategory(USER),
      }),
      { wrapper: wrapper(client) }
    )
    await waitFor(() => expect(result.current.list.data).toHaveLength(1))

    stubs.getCategories.mockResolvedValue(
      userCategories([wireCategory(7, "Dog things", 10, false)])
    )
    result.current.create.mutate({
      body: { category: "Dog things", icon: "dog", category_type_id: 10 },
    })

    await waitFor(() => expect(result.current.create.isSuccess).toBe(true))
    await waitFor(() => {
      expect(result.current.list.data?.map((entry) => entry.id)).toEqual([1, 7])
    })
  })

  it("renames in place", async () => {
    const client = testClient()
    client.setQueryData(queryKeys.user(USER).categories.all(), [
      category(1, "Groceries", 10, false),
    ])
    stubs.putUserCategory.mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useUpdateCategory(USER), {
      wrapper: wrapper(client),
    })
    result.current.mutate({
      categoryId: 1,
      body: { category: "Food", icon: "circle", category_type_id: 10 },
    })

    await waitFor(() => {
      const rows = client.getQueryData<{ name: string }[]>(
        queryKeys.user(USER).categories.all()
      )
      expect(rows?.[0]?.name).toBe("Food")
    })
  })

  it("rolls the list back when a delete is refused", async () => {
    const client = testClient()
    const rows = [category(1, "Groceries", 10, false)]
    client.setQueryData(queryKeys.user(USER).categories.all(), rows)
    stubs.deleteUserCategory.mockRejectedValue({ kind: "conflict" })

    const { result } = renderHook(() => useDeleteCategory(USER), {
      wrapper: wrapper(client),
    })
    result.current.mutate({ categoryId: 1 })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(client.getQueryData(queryKeys.user(USER).categories.all())).toEqual(
      rows
    )
  })

  it("renames a type on its own key", async () => {
    const client = testClient()
    client.setQueryData(queryKeys.user(USER).categories.types(), [
      { id: 30, name: "Sabbatical", isGlobal: false },
    ])
    stubs.putUserCategoryType.mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useUpdateCategoryType(USER), {
      wrapper: wrapper(client),
    })
    result.current.mutate({ typeId: 30, body: { name: "Sabbatical 2027" } })

    await waitFor(() => {
      const types = client.getQueryData<{ name: string }[]>(
        queryKeys.user(USER).categories.types()
      )
      expect(types?.[0]?.name).toBe("Sabbatical 2027")
    })
  })
})

describe("form schemas", () => {
  it("mirrors the server length rules", () => {
    expect(
      categoryFormSchema.safeParse({
        category: "  Groceries  ",
        icon: "shopping-cart",
        category_type_id: 1,
      }).data
    ).toEqual({
      category: "Groceries",
      icon: "shopping-cart",
      category_type_id: 1,
    })

    const tooLong = categoryFormSchema.safeParse({
      category: "x".repeat(101),
      icon: "circle",
      category_type_id: 1,
    })
    expect(tooLong.error?.issues[0]?.message).toBe(
      "Must be between 1 and 100 characters."
    )

    expect(categoryTypeFormSchema.safeParse({ name: "   " }).success).toBe(
      false
    )
    expect(
      categoryTypeFormSchema.safeParse({ name: "x".repeat(51) }).error
        ?.issues[0]?.message
    ).toBe("Must be between 1 and 50 characters.")
  })
})
