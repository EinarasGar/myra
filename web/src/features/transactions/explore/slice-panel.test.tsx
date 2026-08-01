import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { LedgerResult, LedgerRow } from "../api"
import {
  assetUnitsOf,
  groupRowsByDay,
  planLedgerQuery,
  toLedgerRows,
  toLookupIndex,
} from "../api"
import {
  accountFees,
  cashBalanceTransfer,
  groupItem,
  individualItem,
  lookupTables,
  regular,
  ACCOUNT_CURRENT,
  ASSET_USD,
  entry,
} from "../api/fixtures"

import { SlicePanel } from "./slice-panel"
import { loadedSlice } from "./slice"
import { renderExplore, stubViewport, VIEWPORTS } from "./test-harness"

const lookup = toLookupIndex(lookupTables)

const DAY_BEFORE = 1_753_833_600

function rowsFrom(
  items: Parameters<typeof toLedgerRows>[0]
): readonly LedgerRow[] {
  return toLedgerRows(items, lookup)
}

const ROWS = rowsFrom([
  individualItem(regular()),
  individualItem(accountFees()),
  individualItem(cashBalanceTransfer()),
  groupItem([regular({ transaction_id: "tx-a" }), accountFees()]),
  individualItem(
    regular({
      transaction_id: "tx-older",
      date: DAY_BEFORE,
      entry: entry(ACCOUNT_CURRENT, ASSET_USD, -19.5),
    })
  ),
])

function ledgerStub(overrides: Partial<LedgerResult> = {}): LedgerResult {
  const rows = overrides.rows ?? ROWS
  return {
    rows,
    days: groupRowsByDay(rows),
    lookup,
    plan: planLedgerQuery([]),
    source: "combined",
    loadedCount: rows.length,
    unreviewedLoadedCount: 0,
    totalResults: 2542,
    isEmpty: rows.length === 0,
    isEmptyBecauseFiltered: false,
    isPending: false,
    isPlaceholder: false,
    isError: false,
    error: null,
    hasNextPage: true,
    isFetchingNextPage: false,
    isFetching: false,
    fetchNextPage: () => undefined,
    refetch: () => undefined,
    ...overrides,
  }
}

function panel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-slot="slice-panel"]')
}

function footnote(): string {
  return (
    panel()?.querySelector('[data-slot="panel-footnote"]')?.textContent ?? ""
  )
}

beforeEach(() => {
  stubViewport(VIEWPORTS.full)
})

afterEach(cleanup)

describe("loadedSlice", () => {
  it("has nothing to answer when nothing is loaded", () => {
    expect(loadedSlice([], false)).toBeNull()
  })

  it("answers exactly what the day bands below add up to", () => {
    const slice = loadedSlice(ROWS, false)
    const bandTotals = new Map<number, number>()
    for (const day of groupRowsByDay(ROWS)) {
      for (const amount of day.netByCurrency) {
        bandTotals.set(
          amount.asset.assetId,
          (bandTotals.get(amount.asset.assetId) ?? 0) + assetUnitsOf(amount)
        )
      }
    }
    expect(slice).not.toBeNull()
    for (const amount of slice!.netByCurrency) {
      expect(assetUnitsOf(amount)).toBeCloseTo(
        bandTotals.get(amount.asset.assetId) ?? 0,
        8
      )
    }
    expect(slice!.netByCurrency).toHaveLength(bandTotals.size)
  })

  it("keeps each currency on its own and never adds across them", () => {
    const assets = loadedSlice(ROWS, false)!.netByCurrency.map(
      (amount) => amount.asset.ticker
    )
    expect(new Set(assets)).toEqual(new Set(["GBP", "USD"]))
  })

  it("counts the transactions inside a group, not the group row", () => {
    expect(loadedSlice(ROWS, false)!.transactionCount).toBe(ROWS.length + 1)
  })

  it("drops the oldest day while pages remain, because it is still filling", () => {
    const partial = loadedSlice(ROWS, true)!
    expect(partial.excludesPartialDay).toBe(true)
    expect(partial.transactionCount).toBe(ROWS.length)
    expect(partial.netByCurrency.map((a) => a.asset.ticker)).toEqual(["GBP"])
    expect(partial.earliest.getTime()).toBe(partial.latest.getTime())
  })

  it("has nothing certain to say when only one day is loaded and more remain", () => {
    const newest = Math.max(...ROWS.map((row) => row.date.getTime()))
    const oneDay = ROWS.filter((row) => row.date.getTime() === newest)
    expect(loadedSlice(oneDay, true)).toBeNull()
  })

  it("spans the oldest and newest loaded dates", () => {
    const slice = loadedSlice(ROWS, false)!
    expect(slice.earliest.getTime()).toBeLessThan(slice.latest.getTime())
  })
})

describe("the slice panel", () => {
  it("invents nothing — no marked figure and no mock badge", async () => {
    await renderExplore(<SlicePanel ledger={ledgerStub()} />)
    expect(panel()).not.toBeNull()
    expect(panel()?.querySelectorAll("[data-mock]")).toHaveLength(0)
    expect(panel()?.querySelectorAll('[data-slot="mock-badge"]')).toHaveLength(
      0
    )
    expect(screen.queryByText(/placeholder/i)).toBeNull()
  })

  it("offers no control it cannot execute", async () => {
    await renderExplore(<SlicePanel ledger={ledgerStub()} />)
    expect(panel()?.querySelectorAll("button")).toHaveLength(0)
    expect(document.querySelectorAll('[data-slot="flow-day"]')).toHaveLength(0)
  })

  it("names its own scope beside the figure", async () => {
    await renderExplore(
      <SlicePanel ledger={ledgerStub({ hasNextPage: false })} />
    )
    const scope = panel()?.querySelector('[data-slot="slice-scope"]')
    expect(scope?.textContent).toContain("6")
    expect(scope?.textContent).toContain("2,542")
    expect(scope?.textContent).toContain("transactions")
  })

  it("never counts transactions against a total of rows", async () => {
    await renderExplore(
      <SlicePanel ledger={ledgerStub({ hasNextPage: false })} />
    )
    const scope =
      panel()?.querySelector('[data-slot="slice-scope"]')?.textContent ?? ""
    expect(scope).toMatch(/6transactionsin5of2,542rows/)
    expect(scope).not.toMatch(/6of2,542/)
  })

  it("says the count is over what matched once a filter has run", async () => {
    const ledger = ledgerStub({
      plan: planLedgerQuery([{ key: "text", value: "tesco" }]),
      totalResults: 214,
    })
    await renderExplore(<SlicePanel ledger={ledger} />)
    expect(
      panel()?.querySelector('[data-slot="slice-scope"]')?.textContent
    ).toContain("matching transactions")
  })

  it("admits it is partial while more rows are unloaded", async () => {
    await renderExplore(<SlicePanel ledger={ledgerStub()} />)
    expect(footnote()).toContain("Loading more extends")
    expect(footnote()).toContain("not a window you picked")
    expect(footnote()).toContain("oldest day loaded is still filling")
  })

  it("claims completeness only when the whole view is loaded", async () => {
    await renderExplore(
      <SlicePanel ledger={ledgerStub({ hasNextPage: false })} />
    )
    expect(footnote()).toContain("Every transaction in this view is loaded")
  })

  it("disappears rather than summarising nothing", async () => {
    await renderExplore(<SlicePanel ledger={ledgerStub({ rows: [] })} />)
    expect(panel()).toBeNull()
  })
})
