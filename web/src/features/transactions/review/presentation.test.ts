import { describe, expect, it } from "vitest"

import { SHELL_WIDTHS } from "@/components/layout/breakpoints"
import {
  columnTemplateMinWidth,
  columnTrackCount,
  MAX_TABLE_WIDTH,
} from "@/components/primitives"

import { QUEUE_COLUMNS, QUEUE_ROWS_DRAWN, queueCellCount } from "./presentation"

describe("up-next columns", () => {
  it.each(SHELL_WIDTHS)("declares one track per cell at %s", (width) => {
    expect(columnTrackCount(QUEUE_COLUMNS[width])).toBe(queueCellCount(width))
  })

  it.each(SHELL_WIDTHS)("fits inside the %s shell without panning", (width) => {
    expect(
      columnTemplateMinWidth(QUEUE_COLUMNS[width], { gap: 14, padding: 18 })
    ).toBeLessThanOrEqual(MAX_TABLE_WIDTH[width])
  })

  it("sheds columns in the stated order and never the amount", () => {
    expect(queueCellCount("full")).toBe(5)
    expect(queueCellCount("tight")).toBe(4)
    expect(queueCellCount("stacked")).toBe(3)
    expect(queueCellCount("phone")).toBe(2)
    for (const width of SHELL_WIDTHS) {
      expect(QUEUE_COLUMNS[width].split(" ").at(-1)).toMatch(/^\d+px$/)
    }
  })

  it("draws fewer rows as the shell narrows, never none", () => {
    expect(QUEUE_ROWS_DRAWN.full).toBeGreaterThanOrEqual(
      QUEUE_ROWS_DRAWN.stacked
    )
    expect(QUEUE_ROWS_DRAWN.stacked).toBeGreaterThanOrEqual(
      QUEUE_ROWS_DRAWN.phone
    )
    expect(QUEUE_ROWS_DRAWN.phone).toBeGreaterThan(0)
  })
})
