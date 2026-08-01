import { describe, expect, it } from "vitest"

import type { TransactionsSearch } from "@/routes/_auth/_shell/transactions"
import { Route } from "@/routes/_auth/_shell/transactions"

type SearchValidator =
  | ((input: unknown) => TransactionsSearch)
  | { parse: (input: unknown) => TransactionsSearch }

function parseSearch(input: unknown): TransactionsSearch {
  const validate = Route.options.validateSearch as unknown as SearchValidator
  return typeof validate === "function"
    ? validate(input)
    : validate.parse(input)
}

describe("the /transactions address", () => {
  it("opens on Explore when nothing is asked for", () => {
    expect(parseSearch({})).toEqual({ mode: "explore" })
  })

  it("carries the open transaction, so a drawer can be reloaded and shared", () => {
    const search = parseSearch({ tx: "019fb768-61a7-79bd-87a2-c9ec0473327f" })
    expect(search.tx).toBe("019fb768-61a7-79bd-87a2-c9ec0473327f")
  })

  it("carries which groups are open", () => {
    expect(parseSearch({ expand: "group-a,group-b" }).expand).toBe(
      "group-a,group-b"
    )
  })

  it("keeps every filter it is given", () => {
    expect(
      parseSearch({
        q: "lidl",
        account: "acc-1",
        category: "7",
        type: "regular",
        from: "2026-07-01",
        to: "2026-07-31",
        group: "category",
      })
    ).toMatchObject({
      q: "lidl",
      account: "acc-1",
      category: 7,
      type: "regular",
      from: "2026-07-01",
      to: "2026-07-31",
      group: "category",
    })
  })

  it("drops what it cannot read instead of failing the page", () => {
    expect(
      parseSearch({
        mode: "nonsense",
        group: "by-vibes",
        category: "abc",
        upload: "video",
      })
    ).toEqual({ mode: "explore" })
  })
})
