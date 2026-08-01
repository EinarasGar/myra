import { describe, expect, it } from "vitest"

import {
  bandSpanMismatch,
  columnTemplateMinWidth,
  columnTrackCount,
  MAX_TABLE_WIDTH,
  normalizeColumnTemplate,
  resolveColumnLayout,
  resolveColumnTemplates,
  rowArityMismatch,
  rowOutsideTableMessage,
} from "./table-columns"

const FULL_LEDGER = "26px 22px 1fr 108px 132px 128px 118px"

describe("columnTemplateMinWidth", () => {
  it("adds fixed tracks, gaps and both paddings", () => {
    expect(columnTemplateMinWidth(FULL_LEDGER, { gap: 14, padding: 18 })).toBe(
      654
    )
  })

  it.each([
    "auto",
    "max-content",
    "min-content",
    "fit-content(20ch)",
    "25%",
    "8ch",
    "4rem",
  ])("refuses to silently measure %s as zero", (track) => {
    expect(() =>
      columnTemplateMinWidth(`80px ${track}`, { gap: 0, padding: 0 })
    ).toThrow(/no measurable minimum width/)
  })

  it("measures a content track once it declares a floor", () => {
    expect(
      columnTemplateMinWidth("80px minmax(96px,auto)", { gap: 0, padding: 0 })
    ).toBe(176)
  })

  it("counts a minmax track by its floor, not its ceiling", () => {
    expect(
      columnTemplateMinWidth("minmax(0,1fr) minmax(90px,120px)", {
        gap: 0,
        padding: 0,
      })
    ).toBe(90)
  })
})

describe("normalizeColumnTemplate", () => {
  it("floors flexible tracks at zero so content cannot widen the grid", () => {
    expect(normalizeColumnTemplate("26px 1fr 2fr auto")).toBe(
      "26px minmax(0,1fr) minmax(0,2fr) auto"
    )
  })
})

describe("resolveColumnTemplates", () => {
  it("inherits each width from the next wider declaration", () => {
    const templates = resolveColumnTemplates({
      full: "100px 100px",
      stacked: "50px",
    })

    expect(templates.full).toBe("100px 100px")
    expect(templates.tight).toBe("100px 100px")
    expect(templates.stacked).toBe("50px")
    expect(templates.phone).toBe("50px")
  })
})

describe("columnTrackCount", () => {
  it("counts a minmax track once, not once per argument", () => {
    expect(columnTrackCount("minmax(0,1fr) minmax(96px,auto) 116px")).toBe(3)
  })
})

describe("rowArityMismatch", () => {
  const row = {
    slot: "row",
    label: "Holdings",
    width: "stacked" as const,
    template: "minmax(0,1fr) 116px 116px",
  }

  it("says nothing when every track has its cell", () => {
    expect(rowArityMismatch({ ...row, cells: 3 })).toBeNull()
  })

  it("names the wrapped cell when a row overflows its template", () => {
    const message = rowArityMismatch({ ...row, cells: 4 })
    expect(message).toContain('DataTable row in "Holdings"')
    expect(message).toContain('4 cells at the "stacked" width')
    expect(message).toContain("has 3 tracks")
    expect(message).toContain("cell 4 wraps onto a second implicit grid row")
  })

  it("counts the empty tracks when a row is short", () => {
    expect(rowArityMismatch({ ...row, cells: 1 })).toContain(
      "leaving 2 tracks empty and the cells under the wrong headers"
    )
  })

  it("stays readable without a table label and for a single cell", () => {
    const message = rowArityMismatch({
      slot: "header row",
      width: "phone",
      template: "minmax(0,1fr) 104px",
      cells: 1,
    })
    expect(message).toContain("DataTable header row renders 1 cell")
    expect(message).toContain("leaving 1 track empty")
  })
})

describe("bandSpanMismatch", () => {
  const band = {
    label: "Transactions",
    width: "tight" as const,
    template: "minmax(0,1fr) 116px 112px",
    cells: 1,
  }

  it("says nothing when the span covers exactly the tracks that width has", () => {
    expect(bandSpanMismatch({ ...band, span: 3 })).toBeNull()
  })

  it("catches a hand-counted span that outlived its template", () => {
    const message = bandSpanMismatch({ ...band, span: 4 })
    expect(message).toContain('DataTable spanning row in "Transactions"')
    expect(message).toContain('declares aria-colspan 4 at the "tight" width')
    expect(message).toContain("has 3 tracks")
  })

  it("catches a spanning row that smuggled a second cell onto the grid", () => {
    expect(bandSpanMismatch({ ...band, span: 3, cells: 2 })).toContain(
      "must hold exactly one cell"
    )
  })
})

describe("rowOutsideTableMessage", () => {
  it("names the slot and points at the row types that may span the grid", () => {
    const message = rowOutsideTableMessage("header row")
    expect(message).toContain(
      "DataTable header row rendered outside a DataTable"
    )
    expect(message).toContain("DayBandRow")
  })
})

describe("resolveColumnLayout", () => {
  it("rejects the documented full ledger grid on a phone", () => {
    expect(() => resolveColumnLayout(FULL_LEDGER, 14, 18)).toThrow(
      `DataTable columns "26px 22px minmax(0,1fr) 108px 132px 128px 118px" need 654px at the "phone" width, which has ${MAX_TABLE_WIDTH.phone}px.`
    )
  })

  it("accepts the full grid once narrow widths shed columns", () => {
    const layout = resolveColumnLayout(
      {
        full: FULL_LEDGER,
        tight: "1fr 150px 130px 116px",
        stacked: "16px 1fr minmax(96px,auto)",
      },
      { full: 14, tight: 12 },
      { full: 18, tight: 15 }
    )

    expect(layout.tight).toEqual({
      template: "minmax(0,1fr) 150px 130px 116px",
      gap: 12,
      padding: 15,
    })
    expect(layout.phone.template).toBe("16px minmax(0,1fr) minmax(96px,auto)")
    for (const width of ["phone", "stacked", "tight", "full"] as const) {
      expect(
        columnTemplateMinWidth(layout[width].template, layout[width])
      ).toBeLessThanOrEqual(MAX_TABLE_WIDTH[width])
    }
  })

  it("never allows a template wider than the viewport that carries it", () => {
    expect(MAX_TABLE_WIDTH.phone).toBeLessThan(360)
    expect(() =>
      resolveColumnLayout({ full: "200px 1fr 200px" }, 14, 18)
    ).toThrow(/phone/)
  })
})
