import { MutationObserver } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { createQueryClient, queryKeys } from "@/lib/query"

import { removeTransactionsFromCache } from "./cache"
import {
  combinedPage,
  ghostTransfer,
  individualItem,
  regular,
} from "./fixtures"
import { prefixOptimisticMutationOptions } from "./optimistic"

const USER = "00000000-0000-0000-0000-000000000000"

function seed() {
  const queryClient = createQueryClient()
  const keys = queryKeys.user(USER)
  const wide = keys.transactions.combined({ limit: 25, query: undefined })
  const narrow = keys.transactions.combined({ limit: 25, query: "tesco" })
  const data = {
    pageParams: [undefined],
    pages: [
      combinedPage([
        individualItem(regular()),
        individualItem(ghostTransfer()),
      ]),
    ],
  }
  queryClient.setQueryData(wide, data)
  queryClient.setQueryData(narrow, structuredClone(data))
  return { queryClient, wide, narrow }
}

function idsAt(
  queryClient: ReturnType<typeof createQueryClient>,
  key: readonly unknown[]
): string[] {
  const data = queryClient.getQueryData(key) as {
    pages: { results: { group_id?: string; transaction_id?: string }[] }[]
  }
  return data.pages.flatMap((page) =>
    page.results.map((item) => item.group_id ?? item.transaction_id ?? "?")
  )
}

function run(
  queryClient: ReturnType<typeof createQueryClient>,
  mutationFn: () => Promise<void>
) {
  const observer = new MutationObserver(
    queryClient,
    prefixOptimisticMutationOptions<void, { transactionId: string }>({
      queryClient,
      mutationKey: ["mutate", "user", USER, "transactions"],
      mutationFn,
      prefixes: [queryKeys.user(USER).transactions.all()],
      apply: (previous, variables) =>
        removeTransactionsFromCache(
          previous,
          new Set([variables.transactionId]),
          new Set()
        ),
      invalidate: [queryKeys.user(USER).portfolio.all()],
    })
  )
  return observer
}

describe("prefixOptimisticMutationOptions", () => {
  it("applies the edit to every cached variant under the prefix", async () => {
    const { queryClient, wide, narrow } = seed()
    const observer = run(queryClient, () => Promise.resolve())

    await observer.mutate({ transactionId: "tx-ghost" })

    expect(idsAt(queryClient, wide)).toEqual(["tx-regular"])
    expect(idsAt(queryClient, narrow)).toEqual(["tx-regular"])
  })

  it("rolls every cache back when the request fails", async () => {
    const { queryClient, wide, narrow } = seed()
    const observer = run(queryClient, () => Promise.reject(new Error("boom")))

    await expect(
      observer.mutate({ transactionId: "tx-ghost" })
    ).rejects.toBeDefined()

    expect(idsAt(queryClient, wide)).toEqual(["tx-regular", "tx-ghost"])
    expect(idsAt(queryClient, narrow)).toEqual(["tx-regular", "tx-ghost"])
  })

  it("normalises the rejection", async () => {
    const { queryClient } = seed()
    const observer = run(queryClient, () => Promise.reject(new Error("boom")))

    await expect(
      observer.mutate({ transactionId: "tx-ghost" })
    ).rejects.toMatchObject({ kind: "unknown" })
  })

  it("leaves caches outside the prefix alone", async () => {
    const { queryClient } = seed()
    const holdings = queryKeys.user(USER).portfolio.holdings({
      defaultAssetId: 1,
      applyOwnershipShare: true,
    })
    queryClient.setQueryData(holdings, {
      results: [{ transaction_id: "tx-ghost" }],
    })
    const observer = run(queryClient, () => Promise.resolve())

    await observer.mutate({ transactionId: "tx-ghost" })

    expect(queryClient.getQueryData(holdings)).toEqual({
      results: [{ transaction_id: "tx-ghost" }],
    })
  })
})
