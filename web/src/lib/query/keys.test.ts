import { hashKey } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { queryKeys } from "./keys"

const USER = "00000000-0000-0000-0000-000000000000"

function isPrefixOf(
  prefix: readonly unknown[],
  key: readonly unknown[]
): boolean {
  return prefix.every(
    (segment, index) => hashKey([segment]) === hashKey([key[index]])
  )
}

describe("queryKeys", () => {
  it("nests every user resource under the user root so one invalidation clears them", () => {
    const keys = queryKeys.user(USER)
    const root = keys.all()

    expect(isPrefixOf(root, keys.accounts.list())).toBe(true)
    expect(
      isPrefixOf(
        root,
        keys.portfolio.holdings({
          defaultAssetId: 1,
          applyOwnershipShare: true,
        })
      )
    ).toBe(true)
    expect(isPrefixOf(root, keys.transactions.combined({ limit: 25 }))).toBe(
      true
    )
    expect(isPrefixOf(root, keys.ai.conversations.list())).toBe(true)
  })

  it("scopes keys per user", () => {
    const a = queryKeys.user("user-a").accounts.list()
    const b = queryKeys.user("user-b").accounts.list()

    expect(hashKey(a)).not.toBe(hashKey(b))
  })

  it("includes the denominating asset in every portfolio key", () => {
    const keys = queryKeys.user(USER).portfolio

    expect(
      hashKey(keys.holdings({ defaultAssetId: 1, applyOwnershipShare: true }))
    ).not.toBe(
      hashKey(keys.holdings({ defaultAssetId: 2, applyOwnershipShare: true }))
    )
    expect(hashKey(keys.overview({ defaultAssetId: 1 }))).not.toBe(
      hashKey(keys.overview({ defaultAssetId: 2 }))
    )
    expect(hashKey(keys.history({ defaultAssetId: 1, range: "1m" }))).not.toBe(
      hashKey(keys.history({ defaultAssetId: 1, range: "1y" }))
    )
  })

  it("keeps ownership-share variants apart", () => {
    const keys = queryKeys.user(USER).portfolio

    expect(
      hashKey(keys.holdings({ defaultAssetId: 1, applyOwnershipShare: true }))
    ).not.toBe(
      hashKey(keys.holdings({ defaultAssetId: 1, applyOwnershipShare: false }))
    )
  })

  it("hashes page params regardless of property order", () => {
    const keys = queryKeys.user(USER).transactions

    expect(hashKey(keys.combined({ limit: 25, query: "tesco" }))).toBe(
      hashKey(keys.combined({ query: "tesco", limit: 25 }))
    )
    expect(hashKey(keys.combined({ limit: 25 }))).not.toBe(
      hashKey(keys.combined({ limit: 50 }))
    )
  })

  it("nests account sub-resources under the account detail key", () => {
    const keys = queryKeys.user(USER).accounts
    const detail = keys.detail("acc-1")

    expect(isPrefixOf(detail, keys.transactions("acc-1", { count: 25 }))).toBe(
      true
    )
    expect(
      isPrefixOf(detail, keys.portfolioOverview("acc-1", { defaultAssetId: 1 }))
    ).toBe(true)
    expect(
      isPrefixOf(
        detail,
        keys.portfolioHistory("acc-2", { defaultAssetId: 1, range: "1m" })
      )
    ).toBe(false)
  })

  it("separates global reference data from user data", () => {
    expect(
      isPrefixOf(
        queryKeys.reference.all(),
        queryKeys.reference.assets.search({ count: 25 })
      )
    ).toBe(true)
    expect(
      isPrefixOf(queryKeys.user(USER).all(), queryKeys.reference.assetTypes())
    ).toBe(false)
  })

  it("distinguishes asset pair rate ranges", () => {
    const assets = queryKeys.reference.assets

    expect(hashKey(assets.pairRates(1, 2, { range: "1m" }))).not.toBe(
      hashKey(assets.pairRates(1, 2, { range: "1y" }))
    )
    expect(hashKey(assets.converted(1, 2))).not.toBe(hashKey(assets.pair(1, 2)))
  })
})
