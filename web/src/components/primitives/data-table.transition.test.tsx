import { act, cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createSeriesColors } from "@/components/chart"
import {
  ShellWidthProvider,
  SHELL_WIDTHS,
  useShellWidth,
  type ShellWidth,
} from "@/components/layout/breakpoints"
import { AccountGroup } from "@/features/accounts/account-group"
import type {
  AccountIndexGroup,
  AccountIndexRow,
} from "@/features/accounts/rows"
import { renderAccounts } from "@/features/accounts/test-harness"
import {
  buildHoldingRows,
  buildPeriodColumn,
  HOLDINGS_ROWS_DRAWN,
  summariseHoldings,
} from "@/features/portfolio"
import { holdingsFixture, overviewFixture } from "@/features/portfolio/fixtures"
import { HoldingsTable } from "@/features/portfolio/holdings-table"
import { renderPortfolio } from "@/features/portfolio/test-harness"

import {
  DataCell,
  DataRow,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
  DataTableHeaderRow,
  DayBandRow,
  FigureCell,
} from "./data-table"
import {
  columnTrackCount,
  normalizeColumnTemplate,
  type DataTableColumns,
} from "./table-columns"

const VIEWPORTS: Record<ShellWidth, number> = {
  phone: 390,
  stacked: 900,
  tight: 1100,
  full: 1440,
}

type Listener = () => void

type Query = {
  minWidth: number
  matches: boolean
  listeners: Set<Listener>
}

let viewport = VIEWPORTS.full
let queries = new Map<string, Query>()
let subscriptions = 0

function installViewport(initial: ShellWidth) {
  viewport = VIEWPORTS[initial]
  queries = new Map()
  subscriptions = 0

  window.matchMedia = ((media: string) => {
    const minWidth = Number(/min-width:\s*(\d+)px/.exec(media)?.[1] ?? 0)
    const query = queries.get(media) ?? {
      minWidth,
      matches: viewport >= minWidth,
      listeners: new Set<Listener>(),
    }
    queries.set(media, query)
    return {
      get matches() {
        return query.matches
      },
      media,
      onchange: null,
      addEventListener: (_: string, listener: Listener) => {
        subscriptions += 1
        query.listeners.add(listener)
      },
      removeEventListener: (_: string, listener: Listener) => {
        query.listeners.delete(listener)
      },
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
}

function resizeTo(width: ShellWidth) {
  viewport = VIEWPORTS[width]
  const flipped = [...queries.values()].filter((query) => {
    const matches = viewport >= query.minWidth
    if (matches === query.matches) return false
    query.matches = matches
    return true
  })
  for (const query of flipped) {
    for (const listener of [...query.listeners]) {
      act(() => {
        listener()
      })
    }
  }
}

function auditTables(expected: ShellWidth): number {
  const tables = document.querySelectorAll<HTMLTableElement>(
    '[data-slot="data-table"]'
  )
  expect(tables.length).toBeGreaterThan(0)

  let rows = 0
  for (const table of tables) {
    expect(table.dataset.shellWidth).toBe(expected)
    const tracks = columnTrackCount(table.style.getPropertyValue("--dt-cols"))
    for (const row of table.querySelectorAll("tr")) {
      const spanned = row.querySelector("[aria-colspan]")
      if (spanned !== null) {
        expect(Number(spanned.getAttribute("aria-colspan"))).toBe(tracks)
        expect(row.childElementCount).toBe(1)
      } else {
        expect(row.childElementCount).toBe(tracks)
      }
      rows += 1
    }
  }
  return rows
}

const SHEDDING_COLUMNS = {
  full: "minmax(0,1fr) 92px 116px 132px",
  tight: "minmax(0,1fr) 92px 132px",
  stacked: "minmax(0,1fr) 132px",
  phone: "minmax(0,1fr) 116px",
} as const satisfies DataTableColumns

function tracksAt(width: ShellWidth): number {
  return columnTrackCount(normalizeColumnTemplate(SHEDDING_COLUMNS[width]))
}

function SheddingTable() {
  const width = useShellWidth()
  const wide = width === "full" || width === "tight"
  const full = width === "full"

  return (
    <DataTable columns={SHEDDING_COLUMNS} aria-label="Holdings">
      <DataTableHead>
        <DataTableHeaderRow>
          <DataTableHeaderCell>Asset</DataTableHeaderCell>
          {wide ? (
            <DataTableHeaderCell numeric>Units</DataTableHeaderCell>
          ) : null}
          {full ? (
            <DataTableHeaderCell numeric>Share</DataTableHeaderCell>
          ) : null}
          <DataTableHeaderCell numeric>Value</DataTableHeaderCell>
        </DataTableHeaderRow>
      </DataTableHead>
      <DataTableBody>
        <DayBandRow label="Today" span={tracksAt(width)} />
        <DataRow>
          <DataCell>Vanguard S&P 500</DataCell>
          {wide ? <FigureCell>12.5</FigureCell> : null}
          {full ? <FigureCell>36.7%</FigureCell> : null}
          <FigureCell>9,240.50</FigureCell>
        </DataRow>
        <DataRow variant="totals">
          <DataCell>Total</DataCell>
          {wide ? <DataCell /> : null}
          {full ? <FigureCell>100%</FigureCell> : null}
          <FigureCell>12,320.75</FigureCell>
        </DataRow>
      </DataTableBody>
    </DataTable>
  )
}

function accountRow(overrides: Partial<AccountIndexRow> = {}): AccountIndexRow {
  return {
    accountId: "a1",
    name: "Lloyds Current",
    accountTypeId: 1,
    accountTypeName: "Current",
    accountClass: "cash",
    isLiquid: true,
    isLiability: false,
    liquidityTypeId: 1,
    liquidityTypeName: "Liquid",
    ownershipShare: 1,
    ownershipSharePercent: 100,
    isJoint: false,
    suggestedCurrencyAssetId: null,
    suggestedCurrency: null,
    value: 4183.06,
    ratelessCount: 0,
    hasHoldings: true,
    connector: null,
    unrealisedGains: 1447.2,
    ...overrides,
  }
}

const CASH_GROUP: AccountIndexGroup = {
  accountClass: "cash",
  label: "Cash",
  swatch: "bg-chart-1",
  accounts: [
    accountRow(),
    accountRow({ accountId: "a2", name: "Joint Bills", isJoint: true }),
  ],
  subtotal: 24227.24,
  ratelessCount: 1,
}

function holdings() {
  const rows = buildHoldingRows(holdingsFixture(), overviewFixture())
  return (
    <HoldingsTable
      summary={summariseHoldings(rows, holdingsFixture(), overviewFixture())}
      period={buildPeriodColumn(rows, "1m", 1318.9)}
      colors={createSeriesColors(rows.map((row) => row.key))}
      currency="GBP"
      expanded={new Set(rows.map((row) => row.key))}
      onToggle={() => {}}
      shown={HOLDINGS_ROWS_DRAWN}
      onShowAll={() => {}}
    />
  )
}

const PAIRS = SHELL_WIDTHS.flatMap((from) =>
  SHELL_WIDTHS.filter((to) => to !== from).map((to) => [from, to] as const)
)

afterEach(() => {
  cleanup()
})

describe("a DataTable panel crossing a breakpoint", () => {
  it.each(PAIRS)("survives %s -> %s", (from, to) => {
    installViewport(from)
    render(
      <ShellWidthProvider>
        <SheddingTable />
      </ShellWidthProvider>
    )
    expect(auditTables(from)).toBe(4)

    resizeTo(to)

    expect(auditTables(to)).toBe(4)
  })

  it.each(PAIRS)("survives %s -> %s and back", (from, to) => {
    installViewport(from)
    render(
      <ShellWidthProvider>
        <SheddingTable />
      </ShellWidthProvider>
    )

    resizeTo(to)
    resizeTo(from)

    expect(auditTables(from)).toBe(4)
  })

  it.each(PAIRS)("keeps a second panel in step across %s -> %s", (from, to) => {
    installViewport(from)
    render(
      <ShellWidthProvider>
        <SheddingTable />
        <SheddingTable />
      </ShellWidthProvider>
    )

    resizeTo(to)

    expect(auditTables(to)).toBe(8)
  })
})

describe("the panels the resize destroyed", () => {
  it.each([
    ["full", "tight"],
    ["full", "phone"],
    ["phone", "full"],
    ["full", "stacked"],
  ] as const)(
    "keeps portfolio holdings whole across %s -> %s",
    async (from, to) => {
      installViewport(from)
      await renderPortfolio(
        <ShellWidthProvider>{holdings()}</ShellWidthProvider>
      )
      expect(auditTables(from)).toBeGreaterThan(0)

      resizeTo(to)

      expect(auditTables(to)).toBeGreaterThan(0)
    }
  )

  it.each([
    ["full", "stacked"],
    ["full", "tight"],
    ["full", "phone"],
    ["phone", "full"],
  ] as const)("keeps cash accounts whole across %s -> %s", async (from, to) => {
    installViewport(from)
    await renderAccounts(
      <ShellWidthProvider>
        <AccountGroup group={CASH_GROUP} />
      </ShellWidthProvider>
    )
    expect(auditTables(from)).toBeGreaterThan(0)

    resizeTo(to)

    expect(auditTables(to)).toBeGreaterThan(0)
  })
})

describe("the active width", () => {
  it("is read from one subscription however many panels consume it", () => {
    installViewport("full")
    render(
      <ShellWidthProvider>
        <SheddingTable />
        <SheddingTable />
        <SheddingTable />
      </ShellWidthProvider>
    )

    expect(subscriptions).toBe(3)
    expect(queries.size).toBe(3)
  })

  it("is provided once at the app root", () => {
    const sources = import.meta.glob<string>("/src/main.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    })

    expect(sources["/src/main.tsx"]).toContain("<ShellWidthProvider>")
  })

  it("still tracks the viewport for a panel mounted without the provider", () => {
    installViewport("full")
    render(<SheddingTable />)
    expect(auditTables("full")).toBe(4)

    resizeTo("stacked")

    expect(auditTables("stacked")).toBe(4)
  })
})

describe("the arity guard", () => {
  it("still refuses a row that does not follow the width it lands on", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    installViewport("full")

    expect(() =>
      render(
        <ShellWidthProvider>
          <DataTable columns={SHEDDING_COLUMNS} aria-label="Holdings">
            <DataTableBody>
              <DataRow>
                <DataCell>Vanguard S&P 500</DataCell>
                <FigureCell>9,240.50</FigureCell>
              </DataRow>
            </DataTableBody>
          </DataTable>
        </ShellWidthProvider>
      )
    ).toThrow(/renders 2 cells at the "full" width/)

    consoleError.mockRestore()
  })

  it("still refuses a row that sheds nothing when the width sheds a column", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    installViewport("full")

    function Stuck() {
      return (
        <DataTable columns={SHEDDING_COLUMNS} aria-label="Holdings">
          <DataTableBody>
            <DataRow>
              <DataCell>Vanguard S&P 500</DataCell>
              <FigureCell>12.5</FigureCell>
              <FigureCell>36.7%</FigureCell>
              <FigureCell>9,240.50</FigureCell>
            </DataRow>
          </DataTableBody>
        </DataTable>
      )
    }

    render(
      <ShellWidthProvider>
        <Stuck />
      </ShellWidthProvider>
    )

    expect(() => {
      resizeTo("tight")
    }).toThrow(/renders 4 cells at the "tight" width/)

    consoleError.mockRestore()
  })
})
