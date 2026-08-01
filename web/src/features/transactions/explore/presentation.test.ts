import { describe, expect, it } from "vitest"

import { SHELL_WIDTHS } from "@/components/layout/breakpoints"
import {
  columnTemplateMinWidth,
  columnTrackCount,
  MAX_TABLE_WIDTH,
  normalizeColumnTemplate,
} from "@/components/primitives"

import type { LedgerFilterToken } from "../api"
import { planLedgerQuery } from "../api"

import type { LedgerBanding } from "./presentation"
import {
  LEDGER_COLUMNS,
  LEDGER_GAP,
  LEDGER_PADDING,
  ledgerBanding,
  ledgerCellCount,
  ledgerChildSize,
  ledgerColumns,
  ledgerEmptyState,
  ledgerRowSize,
} from "./presentation"

const BANDINGS: LedgerBanding[] = ["day", "pivot"]

const CASES = BANDINGS.flatMap((banding) =>
  SHELL_WIDTHS.map((width) => [banding, width] as const)
)

describe("the ledger grid", () => {
  it.each(CASES)(
    "emits exactly one %s cell per track at the %s width",
    (banding, width) => {
      expect(ledgerCellCount(ledgerColumns(width, banding))).toBe(
        columnTrackCount(
          normalizeColumnTemplate(LEDGER_COLUMNS[banding][width])
        )
      )
    }
  )

  it.each(CASES)("fits a %s band inside the %s width", (banding, width) => {
    const required = columnTemplateMinWidth(
      normalizeColumnTemplate(LEDGER_COLUMNS[banding][width]),
      { gap: LEDGER_GAP[banding][width], padding: LEDGER_PADDING[width] }
    )
    expect(required).toBeLessThanOrEqual(MAX_TABLE_WIDTH[width])
  })

  it.each(BANDINGS)("keeps description and amount at every %s width", (b) => {
    for (const width of SHELL_WIDTHS) {
      expect(ledgerCellCount(ledgerColumns(width, b))).toBeGreaterThanOrEqual(2)
    }
  })

  it.each(BANDINGS)("sheds %s columns in one direction only", (banding) => {
    const counts = SHELL_WIDTHS.map((width) =>
      ledgerCellCount(ledgerColumns(width, banding))
    )
    expect(counts).toEqual([...counts].sort((a, b) => a - b))
  })

  it.each(BANDINGS)("sheds type before category and account (%s)", (b) => {
    expect(ledgerColumns("tight", b).type).toBe(false)
    expect(ledgerColumns("tight", b).category).toBe(true)
    expect(ledgerColumns("tight", b).account).toBe(true)
  })

  it.each(BANDINGS)("turns into two-line rows below tight (%s)", (banding) => {
    expect(ledgerColumns("stacked", banding).twoLine).toBe(true)
    expect(ledgerColumns("phone", banding).twoLine).toBe(true)
    expect(ledgerColumns("tight", banding).twoLine).toBe(false)
  })
})

describe("the date column", () => {
  it("is dropped under day bands, which already print the date", () => {
    expect(ledgerColumns("full", "day").date).toBe(false)
    expect(ledgerColumns("tight", "day").date).toBe(false)
    expect(LEDGER_COLUMNS.day.full).not.toContain("58px")
  })

  it("appears under a pivot, where no band carries a date", () => {
    expect(ledgerColumns("full", "pivot").date).toBe(true)
    expect(ledgerColumns("tight", "pivot").date).toBe(true)
  })

  it("follows the rendered pivot rather than the requested one", () => {
    expect(ledgerBanding("day")).toBe("day")
    expect(ledgerBanding("category")).toBe("pivot")
    expect(ledgerBanding("account")).toBe("pivot")
  })
})

describe("row heights", () => {
  it("uses the taller day-banded row and its 40px child", () => {
    expect(ledgerRowSize(ledgerColumns("full", "day"))).toBe("table")
    expect(ledgerChildSize(ledgerColumns("full", "day"))).toBe("child")
  })

  it("uses the denser pivot row and its 38px child", () => {
    expect(ledgerRowSize(ledgerColumns("full", "pivot"))).toBe("compact")
    expect(ledgerChildSize(ledgerColumns("full", "pivot"))).toBe(
      "child-compact"
    )
  })

  it("keeps two-line rows at both narrow widths whatever the banding", () => {
    for (const banding of BANDINGS) {
      expect(ledgerRowSize(ledgerColumns("stacked", banding))).toBe("two-line")
      expect(ledgerRowSize(ledgerColumns("phone", banding))).toBe("two-line")
    }
  })
})

function planOf(tokens: LedgerFilterToken[]) {
  return planLedgerQuery(tokens)
}

describe("telling an empty ledger from an empty filter", () => {
  it("calls a full ledger nothing at all", () => {
    expect(ledgerEmptyState(false, planOf([]))).toBe("rows")
    expect(
      ledgerEmptyState(
        false,
        planOf([{ key: "dateFrom", value: "2026-01-01" }])
      )
    ).toBe("rows")
  })

  it("blames no filter when none was asked for", () => {
    expect(ledgerEmptyState(true, planOf([]))).toBe("no-data")
  })

  it("blames the filter only when one actually ran", () => {
    expect(
      ledgerEmptyState(true, planOf([{ key: "text", value: "tesco" }]))
    ).toBe("filtered")
  })

  it("refuses to blame a filter the server never executed", () => {
    expect(
      ledgerEmptyState(true, planOf([{ key: "dateFrom", value: "2026-01-01" }]))
    ).toBe("unapplied-only")
    expect(
      ledgerEmptyState(
        true,
        planOf([
          { key: "dateFrom", value: "2026-01-01" },
          { key: "dateTo", value: "2026-02-01" },
        ])
      )
    ).toBe("unapplied-only")
  })

  it("blames the filter when an applied token rides with an unapplied one", () => {
    expect(
      ledgerEmptyState(
        true,
        planOf([
          { key: "text", value: "tesco" },
          { key: "dateFrom", value: "2026-01-01" },
        ])
      )
    ).toBe("filtered")
  })
})
