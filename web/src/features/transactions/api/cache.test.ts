import { describe, expect, it } from "vitest"

import { removeTransactionsFromCache, setVisibilityInCache } from "./cache"
import {
  at,
  combinedPage,
  ghostTransfer,
  groupItem,
  individualItem,
  regular,
} from "./fixtures"

interface CachedItemView {
  item_type: "individual" | "group"
  transaction_id?: string
  group_id?: string
  visibility?: string
  transactions?: { transaction_id: string; visibility?: string }[]
}

interface PageView {
  results: CachedItemView[]
  has_more: boolean
}

function page() {
  return combinedPage([
    individualItem(regular()),
    individualItem(ghostTransfer()),
    groupItem([regular({ transaction_id: "tx-child" })]),
  ])
}

function infinite() {
  return { pageParams: [undefined], pages: [page()] }
}

function pagesOf(data: unknown): PageView[] {
  return (data as { pages: PageView[] }).pages
}

function itemAt(data: unknown, index: number): CachedItemView {
  return at(at(pagesOf(data), 0).results, index)
}

function resultIds(data: unknown): string[] {
  return pagesOf(data).flatMap((entry) =>
    entry.results.map((item) => item.group_id ?? item.transaction_id ?? "?")
  )
}

describe("removeTransactionsFromCache", () => {
  it("removes a top-level transaction from every page", () => {
    const next = removeTransactionsFromCache(
      infinite(),
      new Set(["tx-ghost"]),
      new Set()
    )
    expect(resultIds(next)).toEqual(["tx-regular", "group-1"])
  })

  it("removes a whole group by id", () => {
    const next = removeTransactionsFromCache(
      infinite(),
      new Set(),
      new Set(["group-1"])
    )
    expect(resultIds(next)).toEqual(["tx-regular", "tx-ghost"])
  })

  it("removes a child inside a group and drops the group when it empties", () => {
    const next = removeTransactionsFromCache(
      infinite(),
      new Set(["tx-child"]),
      new Set()
    )
    expect(resultIds(next)).toEqual(["tx-regular", "tx-ghost"])
  })

  it("keeps a group that still has children", () => {
    const withTwo = {
      pageParams: [undefined],
      pages: [
        combinedPage([
          groupItem([
            regular({ transaction_id: "tx-a" }),
            regular({ transaction_id: "tx-b" }),
          ]),
        ]),
      ],
    }
    const group = itemAt(
      removeTransactionsFromCache(withTwo, new Set(["tx-a"]), new Set()),
      0
    )
    expect(group.item_type).toBe("group")
    expect(group.transactions).toHaveLength(1)
  })

  it("never mutates the snapshot it was given", () => {
    const before = infinite()
    removeTransactionsFromCache(before, new Set(["tx-regular"]), new Set())
    expect(resultIds(before)).toContain("tx-regular")
  })

  it("passes through a cache entry that is not a transaction page", () => {
    const accounts = { accounts: [{ account_id: "a" }] }
    expect(
      removeTransactionsFromCache(accounts, new Set(["a"]), new Set())
    ).toBe(accounts)
    expect(removeTransactionsFromCache(undefined, new Set(), new Set())).toBe(
      undefined
    )
  })

  it("edits a bare page as well as an infinite one", () => {
    const next = removeTransactionsFromCache(
      page(),
      new Set(["tx-regular"]),
      new Set()
    ) as PageView
    expect(next.results).toHaveLength(2)
    expect(next.has_more).toBe(false)
  })
})

describe("setVisibilityInCache", () => {
  it("patches a top-level transaction", () => {
    const next = setVisibilityInCache(
      infinite(),
      new Set(["tx-ghost"]),
      "default"
    )
    expect(itemAt(next, 1).visibility).toBe("default")
  })

  it("patches a transaction nested in a group", () => {
    const next = setVisibilityInCache(
      infinite(),
      new Set(["tx-child"]),
      "ghost"
    )
    expect(at(itemAt(next, 2).transactions ?? [], 0).visibility).toBe("ghost")
  })

  it("leaves unrelated rows untouched", () => {
    const next = setVisibilityInCache(
      infinite(),
      new Set(["tx-ghost"]),
      "hidden"
    )
    expect(itemAt(next, 0).visibility).toBeUndefined()
  })
})
