import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { createSeriesColors } from "@/components/chart"

import { CompositionPanel } from "./composition-panel"
import {
  holdingsFixture,
  leveragedHoldingsFixture,
  overviewFixture,
} from "./fixtures"
import { buildHoldingRows, summariseHoldings } from "./holdings"
import { HoldingsTable } from "./holdings-table"
import type { PeriodColumn } from "./period"
import { PERIOD_COLUMN_MOCK_ID } from "./period"
import { renderPortfolio, stubViewport, VIEWPORTS } from "./test-harness"

const NO_PERIOD: PeriodColumn = {
  label: "Last month",
  byHolding: {},
  byAccount: {},
  total: null,
  mockId: PERIOD_COLUMN_MOCK_ID,
}

const overview = overviewFixture()

function percentIn(text: string): number {
  const match = /(-?−?[\d.]+)%/.exec(text.replace(/−/g, "-"))
  if (match?.[1] === undefined) throw new Error(`no percent in "${text}"`)
  return Number(match[1])
}

async function renderBoth(holdings: ReturnType<typeof holdingsFixture>) {
  const rows = buildHoldingRows(holdings, overview)
  const summary = summariseHoldings(rows, holdings, overview)
  const colors = createSeriesColors(rows.map((row) => row.key))

  await renderPortfolio(
    <>
      <CompositionPanel
        lens="assets"
        onLensChange={() => {}}
        rows={rows}
        holdings={holdings}
        baseCurrency="GBP"
        assetColors={colors}
        accountColors={colors}
      />
      <HoldingsTable
        summary={summary}
        period={NO_PERIOD}
        colors={colors}
        currency="GBP"
        expanded={new Set()}
        onToggle={() => {}}
        shown={summary.rows.length}
        onShowAll={() => {}}
      />
    </>
  )

  return { rows, summary }
}

function legendPercent(label: string): number {
  const item = screen
    .getAllByRole("listitem")
    .find((node) => node.textContent?.startsWith(label))
  if (item === undefined) throw new Error(`no legend entry for ${label}`)
  return percentIn(item.textContent ?? "")
}

function tablePercent(label: string): number {
  const row = within(screen.getByRole("table", { name: "Holdings" }))
    .getAllByRole("row")
    .find((node) => node.textContent?.includes(label))
  if (row === undefined) throw new Error(`no holdings row for ${label}`)
  const cells = within(row).getAllByRole("cell")
  return percentIn(cells[3]?.textContent ?? "")
}

beforeEach(() => {
  stubViewport(VIEWPORTS.full)
})

describe("share basis", () => {
  it("gives the composition legend and the share column one answer for one asset", async () => {
    await renderBoth(leveragedHoldingsFixture())

    expect(tablePercent("BTC")).toBe(legendPercent("BTC"))
    expect(tablePercent("VWRP.LSE")).toBe(legendPercent("VWRP.LSE"))
  })

  it("never lets one holding claim more than the whole portfolio", async () => {
    const { rows } = await renderBoth(leveragedHoldingsFixture())

    for (const row of rows) expect(row.share).toBeLessThanOrEqual(1)
    expect(tablePercent("BTC")).toBeLessThanOrEqual(100)
  })

  it("quotes the same figure in the composition note as in the table", async () => {
    await renderBoth(leveragedHoldingsFixture())

    const note = screen.getByText(/largest holding is/)
    expect(percentIn(note.textContent ?? "")).toBe(tablePercent("BTC"))
  })

  it("totals the share column to net worth over what is held, not to a flat 100%", async () => {
    const { rows, summary } = await renderBoth(leveragedHoldingsFixture())

    const summed = rows.reduce((total, row) => total + row.share, 0)
    expect(summed).toBeCloseTo(summary.totalValue / summary.shareBasis)
    expect(summed).toBeLessThan(1)
    expect(
      screen.getByText(/A balance you owe takes a negative share/)
    ).toBeInTheDocument()
  })

  it("still reads 100% and drops the caveat when nothing is owed", async () => {
    const { rows, summary } = await renderBoth(holdingsFixture())

    expect(summary.shareBasis).toBe(summary.totalValue)
    expect(rows.reduce((total, row) => total + row.share, 0)).toBeCloseTo(1)
    expect(
      screen.queryByText(/A balance you owe takes a negative share/)
    ).not.toBeInTheDocument()
  })

  it("draws no share bar for a balance the user owes", async () => {
    await renderBoth(leveragedHoldingsFixture())

    const table = screen.getByRole("table", { name: "Holdings" })
    const cash = within(table)
      .getAllByRole("row")
      .find((node) => node.textContent?.startsWith("GBP"))
    expect(percentIn(cash?.textContent ?? "")).toBeLessThan(0)
    expect(
      within(cash as HTMLElement).queryByRole("img", { name: /of everything/ })
    ).not.toBeInTheDocument()
  })
})
