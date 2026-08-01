import { createRef } from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SHELL_WIDTHS, type ShellWidth } from "@/components/layout/breakpoints"

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
  GlyphCell,
} from "./data-table"
import { TableFoldRow } from "./fold-row"
import { Panel } from "./panel"
import {
  ChildSeam,
  DisclosureCaret,
  GhostRowMarker,
  InlineRowAction,
} from "./row-state"
import { CountChip, StatusChip } from "./status-chip"
import {
  columnTemplateMinWidth,
  columnTrackCount,
  MAX_TABLE_WIDTH,
  normalizeColumnTemplate,
} from "./table-columns"

const FULL_LEDGER = "26px 22px 1fr 108px 132px 128px 118px"

const COLUMNS = {
  full: FULL_LEDGER,
  tight: "1fr 150px 130px 116px",
  stacked: "16px 1fr minmax(96px,auto)",
  phone: "16px 1fr minmax(96px,auto)",
}

const VIEWPORTS: Record<ShellWidth, number> = {
  full: 1440,
  tight: 1100,
  stacked: 900,
  phone: 390,
}

const STATE_COLUMNS = {
  full: "26px 22px minmax(0,1fr) 130px 118px",
  stacked: "16px minmax(0,1fr) minmax(96px,auto)",
}

function setViewportWidth(width: number) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches:
          width >= Number(/\(min-width:\s*(\d+)px\)/.exec(query)?.[1] ?? 0),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList
  )
}

function silenceReact() {
  return vi.spyOn(console, "error").mockImplementation(() => {})
}

beforeEach(() => {
  setViewportWidth(390)
})

describe("DataTable", () => {
  it("keeps table semantics while laying rows out on the design grid", () => {
    render(
      <DataTable columns={COLUMNS}>
        <DataTableHead>
          <DataTableHeaderRow>
            <DataTableHeaderCell>
              <span className="sr-only">Type</span>
            </DataTableHeaderCell>
            <DataTableHeaderCell>Description</DataTableHeaderCell>
            <DataTableHeaderCell numeric>Amount</DataTableHeaderCell>
          </DataTableHeaderRow>
        </DataTableHead>
        <DataTableBody>
          <DataRow>
            <GlyphCell>↓</GlyphCell>
            <DataCell>Tesco</DataCell>
            <FigureCell>−42.18</FigureCell>
          </DataRow>
        </DataTableBody>
      </DataTable>
    )

    const table = screen.getByRole("table")
    const rowgroups = screen.getAllByRole("rowgroup")
    const rows = screen.getAllByRole("row")
    const amountHeader = screen.getByRole("columnheader", { name: "Amount" })
    const amountCell = screen.getByRole("cell", { name: "−42.18" })

    expect(table).toHaveAttribute("role", "table")
    expect(rowgroups).toHaveLength(2)
    for (const rowgroup of rowgroups) {
      expect(rowgroup).toHaveAttribute("role", "rowgroup")
    }
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row).toHaveAttribute("role", "row")
      expect(row).toHaveClass("grid")
    }
    expect(amountHeader).toHaveAttribute("role", "columnheader")
    expect(amountCell).toHaveAttribute("role", "cell")

    expect(table).toHaveClass("grid")
    expect(amountHeader).toHaveClass("text-right")
    expect(amountCell).toHaveClass("text-right", "whitespace-nowrap")
  })

  it("puts the figure column last so it is the last thing to shrink", () => {
    render(
      <DataTable columns={COLUMNS}>
        <DataTableBody>
          <DataRow>
            <GlyphCell>↓</GlyphCell>
            <DataCell>Tesco</DataCell>
            <FigureCell>−42.18</FigureCell>
          </DataRow>
        </DataTableBody>
      </DataTable>
    )
    const cells = screen.getAllByRole("cell")
    expect(cells.at(-1)).toHaveAttribute("data-figure")
  })
})

describe("a column header that has to survive the scroll", () => {
  const STICKY_COLUMNS = "16px minmax(0,1fr) minmax(96px,auto)"

  function renderInPanel(width: number) {
    setViewportWidth(width)
    return render(
      <Panel data-slot="ledger-panel">
        <DataTable columns={STICKY_COLUMNS}>
          <DataTableHead>
            <DataTableHeaderRow>
              <DataTableHeaderCell>Type</DataTableHeaderCell>
              <DataTableHeaderCell>Description</DataTableHeaderCell>
              <DataTableHeaderCell numeric>Amount</DataTableHeaderCell>
            </DataTableHeaderRow>
          </DataTableHead>
          <DataTableBody>
            <DataRow>
              <GlyphCell>↓</GlyphCell>
              <DataCell>Tesco</DataCell>
              <FigureCell>−42.18</FigureCell>
            </DataRow>
          </DataTableBody>
        </DataTable>
      </Panel>
    )
  }

  it("is not trapped in a panel that clips by scrolling", () => {
    renderInPanel(1440)
    const panel = document.querySelector('[data-slot="ledger-panel"]')
    expect(panel?.className).toContain("overflow-clip")
    expect(panel?.className).not.toContain("overflow-hidden")
  })

  it("sticks to the offset the table publishes", () => {
    renderInPanel(1440)
    const head = document.querySelector("thead")
    expect(head?.className).toContain("sticky")
    expect(head?.className).toContain("top-[var(--dt-head-top,0px)]")
  })

  it("clears the app chrome that is itself sticky at compact widths", () => {
    renderInPanel(1440)
    const wide = document.querySelector<HTMLElement>('[data-slot="data-table"]')
    expect(wide?.style.getPropertyValue("--dt-head-top")).toBe("0px")

    cleanup()
    renderInPanel(390)
    const narrow = document.querySelector<HTMLElement>(
      '[data-slot="data-table"]'
    )
    expect(narrow?.style.getPropertyValue("--dt-head-top")).toBe("52px")
  })
})

describe("DataTable column contract", () => {
  it("refuses a column set that cannot fit the narrowest viewport", () => {
    const consoleError = silenceReact()

    expect(() =>
      render(
        <DataTable columns={FULL_LEDGER}>
          <DataTableBody>
            <DataRow>
              <DataCell>Tesco</DataCell>
            </DataRow>
          </DataTableBody>
        </DataTable>
      )
    ).toThrow(/phone/)

    consoleError.mockRestore()
  })

  it("renders the phone template at 390px without overflowing it", () => {
    render(
      <DataTable columns={COLUMNS} data-testid="ledger">
        <DataTableBody>
          <DataRow>
            <GlyphCell>↓</GlyphCell>
            <DataCell>Tesco</DataCell>
            <FigureCell>−42.18</FigureCell>
          </DataRow>
        </DataTableBody>
      </DataTable>
    )

    const table = screen.getByTestId("ledger")
    expect(table).toHaveAttribute("data-shell-width", "phone")

    const template = table.style.getPropertyValue("--dt-cols")
    expect(template).toBe("16px minmax(0,1fr) minmax(96px,auto)")
    expect(
      columnTemplateMinWidth(template, { gap: 14, padding: 18 })
    ).toBeLessThanOrEqual(MAX_TABLE_WIDTH.phone)
    expect(MAX_TABLE_WIDTH.phone).toBeLessThanOrEqual(390)
  })

  it("keeps the full ledger grid once the viewport can hold it", () => {
    setViewportWidth(1280)

    render(
      <DataTable columns={COLUMNS} data-testid="ledger">
        <DataTableBody>
          <DataRow>
            <DataCell />
            <GlyphCell>↓</GlyphCell>
            <DataCell>Tesco</DataCell>
            <DataCell>Current</DataCell>
            <DataCell>Groceries</DataCell>
            <DataCell>26 Jul</DataCell>
            <FigureCell>−42.18</FigureCell>
          </DataRow>
        </DataTableBody>
      </DataTable>
    )

    expect(
      screen.getByTestId("ledger").style.getPropertyValue("--dt-cols")
    ).toBe("26px 22px minmax(0,1fr) 108px 132px 128px 118px")
  })
})

describe("DataTable cell arity", () => {
  it("refuses a row that emits more cells than the active template has tracks", () => {
    const consoleError = silenceReact()

    expect(() =>
      render(
        <DataTable columns={COLUMNS} aria-label="Holdings">
          <DataTableBody>
            <DataRow>
              <GlyphCell>↓</GlyphCell>
              <DataCell>Tesco</DataCell>
              <FigureCell>−42.18</FigureCell>
              <FigureCell>+1.20</FigureCell>
            </DataRow>
          </DataTableBody>
        </DataTable>
      )
    ).toThrow(
      'DataTable row in "Holdings" renders 4 cells at the "phone" width, but its template "16px minmax(0,1fr) minmax(96px,auto)" has 3 tracks — cell 4 wraps onto a second implicit grid row inside the fixed row height. Emit exactly one cell per track at every width: labels go first, then columns, and the amount column is the last thing standing.'
    )

    consoleError.mockRestore()
  })

  it("refuses a row that leaves the trailing tracks empty", () => {
    const consoleError = silenceReact()

    expect(() =>
      render(
        <DataTable columns={COLUMNS}>
          <DataTableBody>
            <DataRow>
              <DataCell>Tesco</DataCell>
            </DataRow>
          </DataTableBody>
        </DataTable>
      )
    ).toThrow(/renders 1 cell at the "phone" width.*leaving 2 tracks empty/s)

    consoleError.mockRestore()
  })

  it("checks the header row and the totals row too", () => {
    const consoleError = silenceReact()

    expect(() =>
      render(
        <DataTable columns={COLUMNS}>
          <DataTableHead>
            <DataTableHeaderRow>
              <DataTableHeaderCell>Description</DataTableHeaderCell>
              <DataTableHeaderCell numeric>Amount</DataTableHeaderCell>
            </DataTableHeaderRow>
          </DataTableHead>
        </DataTable>
      )
    ).toThrow(/DataTable header row/)

    expect(() =>
      render(
        <DataTable columns={COLUMNS}>
          <DataTableBody>
            <DataRow variant="totals">
              <DataCell>Total</DataCell>
              <FigureCell>−42.18</FigureCell>
            </DataRow>
          </DataTableBody>
        </DataTable>
      )
    ).toThrow(/DataTable totals row/)

    consoleError.mockRestore()
  })

  it("re-checks when the shell width sheds a column", () => {
    const consoleError = silenceReact()
    setViewportWidth(1280)

    const ledger = (
      <DataTable columns={COLUMNS}>
        <DataTableBody>
          <DataRow>
            <GlyphCell>↓</GlyphCell>
            <DataCell>Tesco</DataCell>
            <FigureCell>−42.18</FigureCell>
          </DataRow>
        </DataTableBody>
      </DataTable>
    )

    expect(() => render(ledger)).toThrow(/"full" width/)

    consoleError.mockRestore()
  })

  it("leaves a band row and a fold row out of the contract — they span the grid", () => {
    render(
      <DataTable columns={COLUMNS}>
        <DataTableBody>
          <DayBandRow label="Today" date="26 Jul" net="−£118.40" span={3} />
          <DataRow>
            <GlyphCell>↓</GlyphCell>
            <DataCell>Tesco</DataCell>
            <FigureCell>−42.18</FigureCell>
          </DataRow>
          <TableFoldRow total={12} shown={1} mode="remainder" span={3} />
        </DataTableBody>
      </DataTable>
    )

    expect(screen.getByText("+11 more")).toBeVisible()
  })

  it.each(SHELL_WIDTHS)(
    "catches an overflowing row at the %s width",
    (width) => {
      const consoleError = silenceReact()
      setViewportWidth(VIEWPORTS[width])
      const tracks = columnTrackCount(normalizeColumnTemplate(COLUMNS[width]))

      expect(() =>
        render(
          <DataTable columns={COLUMNS}>
            <DataTableBody>
              <DataRow>
                {Array.from({ length: tracks + 1 }, (_, index) => (
                  <DataCell key={index} />
                ))}
              </DataRow>
            </DataTableBody>
          </DataTable>
        )
      ).toThrow(
        new RegExp(`renders ${tracks + 1} cells at the "${width}" width`)
      )

      consoleError.mockRestore()
    }
  )

  it.each(SHELL_WIDTHS)("catches a short row at the %s width", (width) => {
    const consoleError = silenceReact()
    setViewportWidth(VIEWPORTS[width])
    const tracks = columnTrackCount(normalizeColumnTemplate(COLUMNS[width]))

    expect(() =>
      render(
        <DataTable columns={COLUMNS}>
          <DataTableBody>
            <DataRow>
              {Array.from({ length: tracks - 1 }, (_, index) => (
                <DataCell key={index} />
              ))}
            </DataRow>
          </DataTableBody>
        </DataTable>
      )
    ).toThrow(new RegExp(`at the "${width}" width.*leaving 1 track empty`, "s"))

    consoleError.mockRestore()
  })

  it("refuses a grid row that never reached a DataTable", () => {
    const consoleError = silenceReact()

    expect(() =>
      render(
        <table>
          <tbody>
            <DataRow>
              <DataCell>Tesco</DataCell>
            </DataRow>
          </tbody>
        </table>
      )
    ).toThrow(/DataTable row rendered outside a DataTable/)

    consoleError.mockRestore()
  })

  it("still hands the row element to a caller that asked for it", () => {
    const ref = createRef<HTMLTableRowElement>()

    render(
      <DataTable columns={COLUMNS}>
        <DataTableBody>
          <DataRow ref={ref}>
            <GlyphCell>↓</GlyphCell>
            <DataCell>Tesco</DataCell>
            <FigureCell>−42.18</FigureCell>
          </DataRow>
        </DataTableBody>
      </DataTable>
    )

    expect(ref.current).toBe(screen.getByRole("row"))
  })
})

describe("row states", () => {
  beforeEach(() => {
    setViewportWidth(1280)
  })

  it("draws an unreviewed row structurally, never with opacity", () => {
    render(
      <DataTable columns={STATE_COLUMNS}>
        <DataTableBody>
          <DataRow variant="ghost">
            <DataCell />
            <GlyphCell>
              <GhostRowMarker />
            </GlyphCell>
            <DataCell>
              <span className="text-ghost">Unknown card payment</span>
              <StatusChip status="unreviewed" size="row" />
            </DataCell>
            <DataCell>
              <InlineRowAction>Mark reviewed</InlineRowAction>
            </DataCell>
            <FigureCell className="text-ghost">−12.00</FigureCell>
          </DataRow>
        </DataTableBody>
      </DataTable>
    )

    const row = screen.getByRole("row")
    expect(row).toHaveAttribute("data-variant", "ghost")
    expect(row).toHaveClass("bg-ghost-dim", "border-l-2", "border-l-ghost-dim")
    expect(row.className).not.toMatch(/opacity/)
    expect(screen.getByText("◌")).toBeInTheDocument()
    expect(screen.getByText("Unreviewed")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Mark reviewed" })
    ).toBeInTheDocument()
  })

  it("gives a group parent a caret, a child count and the panel-2 surface", () => {
    render(
      <DataTable columns={STATE_COLUMNS}>
        <DataTableBody>
          <DataRow variant="group" aria-expanded>
            <DataCell />
            <GlyphCell>
              <DisclosureCaret expanded />
            </GlyphCell>
            <DataCell>
              Flight to Lisbon <CountChip>3</CountChip>
            </DataCell>
            <DataCell />
            <FigureCell>−412.00</FigureCell>
          </DataRow>
          <DataRow variant="child" size="child">
            <DataCell />
            <GlyphCell>
              <ChildSeam />
            </GlyphCell>
            <DataCell>Seat reservation</DataCell>
            <DataCell />
            <FigureCell>−18.00</FigureCell>
          </DataRow>
        </DataTableBody>
      </DataTable>
    )

    const [parent, child] = screen.getAllByRole("row")
    expect(parent).toHaveClass("bg-surface-2")
    expect(screen.getByText("▾")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(child).toHaveClass("h-[40px]", "bg-surface-2")
  })

  it("only hovers when the row is interactive", () => {
    render(
      <DataTable columns={STATE_COLUMNS}>
        <DataTableBody>
          <DataRow interactive>
            <DataCell />
            <GlyphCell>↓</GlyphCell>
            <DataCell>Tesco</DataCell>
            <DataCell>Groceries</DataCell>
            <FigureCell>−42.18</FigureCell>
          </DataRow>
        </DataTableBody>
      </DataTable>
    )
    expect(screen.getByRole("row")).toHaveClass(
      "hover:bg-surface-2",
      "duration-instant"
    )
  })
})

describe("DayBandRow", () => {
  beforeEach(() => {
    setViewportWidth(1280)
  })

  it("carries the day net on the right and sticks under the column header", () => {
    render(
      <DataTable columns={COLUMNS}>
        <DataTableBody>
          <DayBandRow label="Today" date="26 Jul" net="−£118.40" span={7} />
        </DataTableBody>
      </DataTable>
    )

    expect(screen.getByRole("row")).toHaveClass(
      "sticky",
      "top-[calc(var(--dt-head-top,0px)+var(--dt-head-h))]",
      "bg-background"
    )
    const cell = screen.getByRole("cell")
    expect(cell).toHaveAttribute("aria-colspan", "7")
    expect(cell).not.toHaveAttribute("colspan")
    expect(screen.getByText("Today")).toBeInTheDocument()
    expect(screen.getByText("−£118.40")).toHaveClass("ms-auto", "tabular-nums")
  })

  it.each(SHELL_WIDTHS)(
    "refuses a band that spans a track count the %s width does not have",
    (width) => {
      const consoleError = silenceReact()
      setViewportWidth(VIEWPORTS[width])
      const tracks = columnTrackCount(normalizeColumnTemplate(COLUMNS[width]))

      expect(() =>
        render(
          <DataTable columns={COLUMNS} aria-label="Transactions">
            <DataTableBody>
              <DayBandRow label="Today" span={tracks + 1} />
            </DataTableBody>
          </DataTable>
        )
      ).toThrow(
        new RegExp(
          `declares aria-colspan ${tracks + 1} at the "${width}" width`
        )
      )

      consoleError.mockRestore()
    }
  )

  it.each(SHELL_WIDTHS)(
    "refuses a fold row that spans the wrong track count at the %s width",
    (width) => {
      const consoleError = silenceReact()
      setViewportWidth(VIEWPORTS[width])
      const tracks = columnTrackCount(normalizeColumnTemplate(COLUMNS[width]))

      expect(() =>
        render(
          <DataTable columns={COLUMNS}>
            <DataTableBody>
              <TableFoldRow total={9} shown={2} span={tracks - 1} />
            </DataTableBody>
          </DataTable>
        )
      ).toThrow(/declares aria-colspan/)

      consoleError.mockRestore()
    }
  )
})
