import { describe, expect, it } from "vitest"

import type { GroupTransactionItem } from "@/api"

import {
  collapseIntoGroupInCache,
  detachFromGroupInCache,
  updateGroupInCache,
} from "./group-cache"
import {
  accountFees,
  cashDividend,
  combinedPage,
  DAY,
  ghostTransfer,
  groupItem,
  individualItem,
  regular,
} from "./fixtures"

interface ItemView {
  item_type?: string
  transaction_id?: string
  group_id?: string
  transactions?: { transaction_id: string }[]
}

interface PageView {
  results: ItemView[]
}

const CHILD = regular({ transaction_id: "tx-child" })

function infinite() {
  return {
    pageParams: [undefined],
    pages: [
      combinedPage([
        individualItem(regular()),
        individualItem(cashDividend()),
        individualItem(ghostTransfer()),
        groupItem([CHILD]),
      ]),
    ],
  }
}

function ids(data: unknown): string[] {
  return (data as { pages: PageView[] }).pages.flatMap((page) =>
    page.results.map((item) => item.group_id ?? item.transaction_id ?? "?")
  )
}

function itemAt(data: unknown, index: number): ItemView {
  const item = (data as { pages: PageView[] }).pages[0]?.results[index]
  if (item === undefined) throw new Error("no item at that index")
  return item
}

function provisional(
  transactionIds: readonly string[],
  groupId = "provisional-1"
): GroupTransactionItem {
  return {
    item_type: "group",
    group_id: groupId,
    category_id: 7,
    date: DAY,
    description: "Weekly shop",
    transactions: transactionIds.map((transaction_id) =>
      regular({ transaction_id })
    ),
  }
}

describe("collapseIntoGroupInCache", () => {
  it("replaces the members with one group row at the first member's place", () => {
    const next = collapseIntoGroupInCache(
      infinite(),
      provisional(["tx-regular", "tx-fee"])
    )
    expect(ids(next)).toEqual([
      "provisional-1",
      "tx-dividend",
      "tx-ghost",
      "group-1",
    ])
  })

  it("keeps every transaction, so the row count falls by one less than the members", () => {
    const before = ids(infinite()).length
    const next = collapseIntoGroupInCache(
      infinite(),
      provisional(["tx-regular", "tx-dividend"])
    )
    expect(ids(next)).toHaveLength(before - 1)
    expect(itemAt(next, 0).transactions).toHaveLength(2)
  })

  it("leaves a listing that carries no member untouched", () => {
    const before = infinite()
    expect(collapseIntoGroupInCache(before, provisional(["tx-absent"]))).toBe(
      before
    )
  })

  it("does not touch an account page, whose rows carry no item_type", () => {
    const accountPage = {
      results: [regular(), accountFees()],
      total_results: 2,
    }
    expect(
      collapseIntoGroupInCache(accountPage, provisional(["tx-regular"]))
    ).toBe(accountPage)
  })

  it("never mutates the snapshot it was given", () => {
    const before = infinite()
    collapseIntoGroupInCache(before, provisional(["tx-regular"]))
    expect(ids(before)).toContain("tx-regular")
  })
})

describe("updateGroupInCache", () => {
  it("moves a top-level transaction under the group it joined", () => {
    const next = updateGroupInCache(infinite(), {
      ...(groupItem([CHILD]) as unknown as GroupTransactionItem),
      transactions: [CHILD, regular({ transaction_id: "tx-regular" })],
    })
    expect(ids(next)).toEqual(["tx-dividend", "tx-ghost", "group-1"])
    expect(itemAt(next, 2).transactions).toHaveLength(2)
  })

  it("leaves a page that does not hold the group alone", () => {
    const before = infinite()
    expect(
      updateGroupInCache(before, {
        ...(groupItem([CHILD]) as unknown as GroupTransactionItem),
        group_id: "group-elsewhere",
        transactions: [regular({ transaction_id: "tx-regular" })],
      })
    ).toBe(before)
  })
})

describe("detachFromGroupInCache", () => {
  it("lifts a child out of its group and back into the listing", () => {
    const next = detachFromGroupInCache(infinite(), {
      groupId: "group-1",
      transaction: regular({ transaction_id: "tx-child" }),
    })
    expect(ids(next)).toEqual([
      "tx-regular",
      "tx-dividend",
      "tx-ghost",
      "tx-child",
    ])
    expect(itemAt(next, 3).item_type).toBe("individual")
  })

  it("keeps the group when other children remain", () => {
    const data = {
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
    const next = detachFromGroupInCache(data, {
      groupId: "group-1",
      transaction: regular({ transaction_id: "tx-a" }),
    })
    expect(ids(next)).toEqual(["group-1", "tx-a"])
    expect(itemAt(next, 0).transactions).toHaveLength(1)
  })

  it("leaves the cache alone when the transaction is not in that group", () => {
    const before = infinite()
    expect(
      detachFromGroupInCache(before, {
        groupId: "group-1",
        transaction: regular({ transaction_id: "tx-elsewhere" }),
      })
    ).toBe(before)
  })
})
