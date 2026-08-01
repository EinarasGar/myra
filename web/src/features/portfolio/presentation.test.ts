import { describe, expect, it } from "vitest"

import { SHELL_WIDTHS } from "@/components/layout/breakpoints"
import {
  columnTemplateMinWidth,
  MAX_TABLE_WIDTH,
  normalizeColumnTemplate,
} from "@/components/primitives"

import {
  HOLDINGS_COLUMNS,
  HOLDINGS_GAP,
  HOLDINGS_PADDING,
  holdingsCellCount,
  holdingsColumns,
  holdingsRowHeight,
  holdingsTrackCount,
  LOT_COLUMNS,
  LOT_GAP,
  LOT_PADDING,
  lotCellCount,
  lotColumns,
  lotRowHeight,
  lotTrackCount,
} from "./presentation"

describe("holdings columns", () => {
  it.each(SHELL_WIDTHS)("emits one cell per track at %s", (width) => {
    expect(holdingsCellCount(holdingsColumns(width))).toBe(
      holdingsTrackCount(width)
    )
  })

  it.each(SHELL_WIDTHS)("fits the %s viewport without panning", (width) => {
    expect(
      columnTemplateMinWidth(normalizeColumnTemplate(HOLDINGS_COLUMNS[width]), {
        gap: HOLDINGS_GAP[width],
        padding: HOLDINGS_PADDING[width],
      })
    ).toBeLessThanOrEqual(MAX_TABLE_WIDTH[width])
  })

  it("sheds chrome before figures, and the value column never leaves", () => {
    expect(holdingsColumns("full").showShare).toBe(true)
    expect(holdingsColumns("tight").showShare).toBe(false)
    expect(holdingsColumns("tight").showPeriod).toBe(true)
    expect(holdingsColumns("stacked").showUnits).toBe(false)
    expect(holdingsColumns("stacked").showPeriod).toBe(true)
    expect(holdingsColumns("phone").showPeriod).toBe(false)
    expect(holdingsTrackCount("phone")).toBe(2)
  })

  it("grows the row as columns drop so a phone row clears the hit target", () => {
    expect(holdingsRowHeight("full")).toBe("h-[54px]")
    expect(holdingsRowHeight("phone")).toBe("h-[58px]")
  })

  it("drops the caret column exactly where the row itself becomes the control", () => {
    expect(holdingsColumns("tight").showCaret).toBe(true)
    expect(holdingsColumns("stacked").showCaret).toBe(false)
  })
})

describe("lot columns", () => {
  it.each(SHELL_WIDTHS)("emits one cell per track at %s", (width) => {
    expect(lotCellCount(lotColumns(width))).toBe(lotTrackCount(width))
  })

  it.each(SHELL_WIDTHS)("fits the %s viewport without panning", (width) => {
    expect(
      columnTemplateMinWidth(normalizeColumnTemplate(LOT_COLUMNS[width]), {
        gap: LOT_GAP[width],
        padding: LOT_PADDING[width],
      })
    ).toBeLessThanOrEqual(MAX_TABLE_WIDTH[width])
  })

  it("keeps Bought, Account and Total at every width", () => {
    for (const width of SHELL_WIDTHS) {
      expect(lotTrackCount(width)).toBeGreaterThanOrEqual(3)
    }
    expect(lotTrackCount("phone")).toBe(3)
  })

  it("keeps the financial row height until the row goes two-line", () => {
    expect(lotRowHeight("stacked")).toBe("h-[48px]")
    expect(lotRowHeight("phone")).toBe("h-[58px]")
  })
})
