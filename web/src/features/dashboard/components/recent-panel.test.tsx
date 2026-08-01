import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthSession } from "@/auth"
import { AuthSessionContext } from "@/auth"

import type { ShellWidth } from "@/components/layout/breakpoints"
import type { LedgerDay, LedgerResult } from "@/features/transactions/api"
import {
  groupRowsByDay,
  planLedgerQuery,
  toLedgerRows,
  toLookupIndex,
} from "@/features/transactions/api"
import {
  accountFees,
  cashDividend,
  ghostTransfer,
  groupItem,
  individualItem,
  lookupTables,
  regular,
} from "@/features/transactions/api/fixtures"

import { renderInRouter, stubViewport } from "../test-router"
import { RecentPanel, RecentPanelEmpty, RecentPanelView } from "./recent-panel"

const SESSION: AuthSession = {
  status: "authenticated",
  isReady: true,
  isAuthenticated: true,
  userId: "00000000-0000-0000-0000-000000000000",
  baseCurrency: "GBP",
  signOut: () => Promise.resolve(),
}

const VIEWPORTS: Record<ShellWidth, number> = {
  full: 1440,
  tight: 1100,
  stacked: 900,
  phone: 390,
}

function days(): LedgerDay[] {
  const rows = toLedgerRows(
    [
      individualItem(regular()),
      individualItem(cashDividend()),
      individualItem(ghostTransfer()),
      individualItem(accountFees()),
      groupItem([regular({ transaction_id: "tx-a" }), accountFees()]),
    ],
    toLookupIndex(lookupTables)
  )
  return [...groupRowsByDay(rows)]
}

const openRow = vi.fn()

const snapReceipt = vi.fn()

async function renderPanel(
  width: ShellWidth,
  totalResults?: number,
  hiddenPerDay: number[] = []
) {
  stubViewport(VIEWPORTS[width])
  const dayList = days().map((day, index) => ({
    ...day,
    hiddenCount: hiddenPerDay[index] ?? 0,
  }))
  const shownCount = dayList.reduce((sum, day) => sum + day.rows.length, 0)
  const hiddenCount = dayList.reduce((sum, day) => sum + day.hiddenCount, 0)
  return renderInRouter(
    <RecentPanelView
      days={dayList}
      totalResults={totalResults}
      shownCount={shownCount}
      hiddenCount={hiddenCount}
      width={width}
      onOpen={openRow}
      onSnapReceipt={snapReceipt}
    />
  )
}

function rows(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="recent-row"]')
  )
}

function cellCounts(): number[] {
  return rows().map((row) => row.querySelectorAll("td").length)
}

beforeEach(() => {
  openRow.mockReset()
  snapReceipt.mockReset()
  stubViewport(VIEWPORTS.full)
})

describe("RecentPanelView", () => {
  it("draws a row for every ledger row it was given", async () => {
    await renderPanel("full")
    expect(rows()).toHaveLength(5)
  })

  it("offers the receipt uploader beside the rows, not only when there are none", async () => {
    await renderPanel("full")

    fireEvent.click(screen.getByRole("button", { name: /Snap a receipt/ }))

    expect(snapReceipt).toHaveBeenCalledTimes(1)
  })

  it("puts a day band above the rows of that day", async () => {
    await renderPanel("full")
    expect(
      document.querySelectorAll('[data-slot="day-band"]').length
    ).toBeGreaterThan(0)
  })

  it.each(["full", "tight", "stacked", "phone"] as const)(
    "keeps the amount column standing at the %s width",
    async (width) => {
      await renderPanel(width)
      for (const row of rows()) {
        const figures = row.querySelectorAll("[data-figure]")
        expect(figures.length).toBeGreaterThan(0)
      }
    }
  )

  it("sheds the account and category column before the amount", async () => {
    await renderPanel("full")
    const wide = cellCounts()
    cleanup()
    await renderPanel("tight")
    const narrow = cellCounts()
    expect(wide.every((count) => count === 4)).toBe(true)
    expect(narrow.every((count) => count === 3)).toBe(true)
  })

  it("gives an unreviewed row the ghost treatment, not an opacity", async () => {
    await renderPanel("full")
    const ghost = rows().find((row) => row.className.includes("bg-ghost-dim"))
    expect(ghost).toBeDefined()
    expect(ghost?.className).toContain("border-l-ghost-dim")
    expect(ghost?.className).not.toContain("opacity")
    expect(ghost?.textContent).toContain("Unreviewed")
  })

  it("hides the day net where there is no room for it", async () => {
    await renderPanel("phone")
    const band = document.querySelector('[data-slot="day-band"]')
    expect(band?.querySelectorAll("[data-figure]")).toHaveLength(0)
  })

  it("names the rows it drew and the ledger they came out of", async () => {
    await renderPanel("full", 412)
    const note = document.querySelector('[data-slot="panel-note"]')
    expect(note?.textContent).toBe("Newest5of412rows")
  })

  it("does not claim a count it was never given", async () => {
    await renderPanel("full")
    expect(
      screen.getByRole("link", { name: "All transactions →" })
    ).toBeVisible()
    expect(
      document.querySelector('[data-slot="panel-note"]')?.textContent
    ).toBe("Newest5rows")
  })

  it("keeps the ledger's total out of the fold, which folds only its own rows", async () => {
    await renderPanel("full", 412, [3])
    expect(screen.getByRole("button", { name: "+3 more" })).toBeVisible()
    expect(screen.queryByRole("button", { name: /40\d more/ })).toBeNull()
  })

  it("offers exactly one way out to the full ledger, with no count on it", async () => {
    await renderPanel("full", 412, [3])
    expect(
      screen.getByRole("link", { name: "All transactions →" })
    ).toBeVisible()
    expect(screen.queryByText(/All 412/)).toBeNull()
  })

  it("counts the rows it loaded when the ledger never gave a total", async () => {
    await renderPanel("full", undefined, [4])
    expect(screen.getByRole("button", { name: "+4 more" })).toBeVisible()
  })

  it("offers no fold when every row it has is on screen", async () => {
    await renderPanel("full", 5)
    expect(document.querySelector('[data-slot="table-fold-row"]')).toBeNull()
  })

  it("refuses to net a day it only half drew", async () => {
    await renderPanel("full", undefined, [2])
    const band = document.querySelector('[data-slot="day-band"]')
    expect(band).not.toBeNull()
    expect(band?.querySelectorAll("[data-figure]")).toHaveLength(0)
  })

  it("still nets a day it drew in full", async () => {
    await renderPanel("full")
    const band = document.querySelector('[data-slot="day-band"]')
    expect(band?.querySelectorAll("[data-figure]") ?? []).not.toHaveLength(0)
  })

  it("opens the thing a row names, by click and by keyboard", async () => {
    await renderPanel("full")
    const row = rows()[0]
    expect(row).toBeDefined()
    expect(row?.tabIndex).toBe(0)
    expect(row?.className).toContain("cursor-pointer")

    fireEvent.click(row as HTMLElement)
    expect(openRow).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(row as HTMLElement, { key: "Enter" })
    expect(openRow).toHaveBeenCalledTimes(2)
  })

  it("counts a group's children on the row", async () => {
    await renderPanel("full")
    const group = rows().find((row) => row.textContent?.includes("Weekly shop"))
    expect(group?.textContent).toContain("2")
  })
})

describe("RecentPanel", () => {
  function ledger(): LedgerResult {
    const dayList = days()
    const rows = dayList.flatMap((day) => day.rows)
    return {
      rows,
      days: dayList,
      lookup: toLookupIndex(lookupTables),
      plan: planLedgerQuery([]),
      source: "combined",
      loadedCount: rows.length,
      unreviewedLoadedCount: 0,
      totalResults: 412,
      isEmpty: false,
      isEmptyBecauseFiltered: false,
      isPending: false,
      isPlaceholder: false,
      isError: false,
      error: null,
      hasNextPage: true,
      isFetchingNextPage: false,
      isFetching: false,
      fetchNextPage: () => {},
      refetch: () => {},
    }
  }

  it("reveals the rows it already holds instead of sending you to the ledger", async () => {
    stubViewport(VIEWPORTS.phone)
    await renderInRouter(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <AuthSessionContext.Provider value={SESSION}>
          <RecentPanel ledger={ledger()} />
        </AuthSessionContext.Provider>
      </QueryClientProvider>
    )

    expect(rows()).toHaveLength(3)
    expect(
      document.querySelector('[data-slot="panel-note"]')?.textContent
    ).toBe("Newest3of412rows")

    fireEvent.click(screen.getByRole("button", { name: "+2 more" }))

    expect(rows()).toHaveLength(5)
    expect(
      document.querySelector('[data-slot="panel-note"]')?.textContent
    ).toBe("Newest5of412rows")
    expect(screen.queryByRole("button", { name: /more$/ })).toBeNull()
  })
})

describe("RecentPanelEmpty", () => {
  it("offers all three ways to get data in", async () => {
    await renderInRouter(<RecentPanelEmpty onSnapReceipt={() => undefined} />)
    expect(screen.getByText("Nothing here yet")).toBeVisible()
    for (const label of [
      "Add a transaction",
      "Connect a bank",
      "Snap a receipt",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeVisible()
    }
  })

  it("opens the uploader in place instead of leaving the dashboard", async () => {
    const onSnapReceipt = vi.fn()
    await renderInRouter(<RecentPanelEmpty onSnapReceipt={onSnapReceipt} />)

    fireEvent.click(screen.getByRole("button", { name: "Snap a receipt" }))

    expect(onSnapReceipt).toHaveBeenCalledTimes(1)
  })
})
