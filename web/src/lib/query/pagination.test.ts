import { describe, expect, it } from "vitest"

import type { CursorPage, OffsetPage } from "./pagination"
import {
  cursorInfiniteQueryOptions,
  flattenPages,
  offsetInfiniteQueryOptions,
  totalResultsOf,
} from "./pagination"

interface Row {
  id: string
}

const cursorOptions = cursorInfiniteQueryOptions<CursorPage<Row>, string[]>({
  queryKey: ["ledger"],
  fetchPage: () =>
    Promise.resolve({ results: [], has_more: false, next_cursor: null }),
})

const offsetOptions = offsetInfiniteQueryOptions<OffsetPage<Row>, string[]>({
  queryKey: ["assets"],
  fetchPage: () => Promise.resolve({ results: [], total_results: 0 }),
})

function cursorNext(page: CursorPage<Row>) {
  return cursorOptions.getNextPageParam(page, [page], undefined, [undefined])
}

function offsetNext(pages: Array<OffsetPage<Row>>) {
  const last = pages[pages.length - 1]!
  return offsetOptions.getNextPageParam(last, pages, 0, [0])
}

describe("cursorInfiniteQueryOptions", () => {
  it("starts without a cursor", () => {
    expect(cursorOptions.initialPageParam).toBeUndefined()
  })

  it("follows next_cursor while has_more is true", () => {
    expect(
      cursorNext({ results: [], has_more: true, next_cursor: "cursor-2" })
    ).toBe("cursor-2")
  })

  it("stops when has_more is false even if a cursor is present", () => {
    expect(
      cursorNext({ results: [], has_more: false, next_cursor: "cursor-2" })
    ).toBeUndefined()
  })

  it("stops when the server omits or nulls next_cursor", () => {
    expect(
      cursorNext({ results: [], has_more: true, next_cursor: null })
    ).toBeUndefined()
    expect(cursorNext({ results: [], has_more: true })).toBeUndefined()
  })
})

describe("offsetInfiniteQueryOptions", () => {
  it("starts at offset zero", () => {
    expect(offsetOptions.initialPageParam).toBe(0)
  })

  it("advances by the number of loaded rows until total_results is reached", () => {
    const page = { results: [{ id: "a" }, { id: "b" }], total_results: 5 }

    expect(offsetNext([page])).toBe(2)
    expect(offsetNext([page, page])).toBe(4)
    expect(offsetNext([page, page, page])).toBeUndefined()
  })

  it("stops on an empty page rather than looping forever", () => {
    expect(offsetNext([{ results: [], total_results: 99 }])).toBeUndefined()
  })
})

describe("changing the key", () => {
  const previous = {
    pages: [{ results: [{ id: "a" }], has_more: false }],
    pageParams: [undefined],
  }

  it("drops to a skeleton unless the caller opts in", () => {
    expect(cursorOptions.placeholderData).toBeUndefined()
    expect(offsetOptions.placeholderData).toBeUndefined()
  })

  it("holds the previous page for a caller that opts in", () => {
    const kept = [
      cursorInfiniteQueryOptions<CursorPage<Row>, string[]>({
        queryKey: ["ledger"],
        keepPreviousPage: true,
        fetchPage: () =>
          Promise.resolve({ results: [], has_more: false, next_cursor: null }),
      }),
      offsetInfiniteQueryOptions<OffsetPage<Row>, string[]>({
        queryKey: ["assets"],
        keepPreviousPage: true,
        fetchPage: () => Promise.resolve({ results: [], total_results: 0 }),
      }),
    ]

    for (const options of kept) {
      const placeholder = options.placeholderData
      expect(placeholder).toBeTypeOf("function")
      expect((placeholder as (previous: unknown) => unknown)(previous)).toEqual(
        previous
      )
    }
  })
})

describe("page helpers", () => {
  it("flattens loaded pages in order", () => {
    const data = {
      pages: [{ results: [{ id: "a" }] }, { results: [{ id: "b" }] }],
      pageParams: [undefined, "cursor-2"],
    }

    expect(flattenPages(data)).toEqual([{ id: "a" }, { id: "b" }])
    expect(flattenPages(undefined)).toEqual([])
  })

  it("reads total_results from the first page that reports it", () => {
    expect(
      totalResultsOf({
        pages: [{ total_results: null }, { total_results: 2203 }],
        pageParams: [undefined, "cursor-2"],
      })
    ).toBe(2203)

    expect(
      totalResultsOf({
        pages: [{ total_results: null }],
        pageParams: [undefined],
      })
    ).toBeUndefined()
  })
})
