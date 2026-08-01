import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AllocationBar } from "./allocation-bar"
import { createSeriesColors } from "./series-colors"
import { ShareBar } from "./share-bar"

function widths(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll("rect")).map((rect) =>
    Number(rect.getAttribute("width"))
  )
}

describe("AllocationBar", () => {
  it("lays segments out in proportion and fills the full track", () => {
    const { container } = render(
      <AllocationBar
        label="Allocation"
        colors={createSeriesColors(["vusa", "btc"])}
        segments={[
          { key: "vusa", label: "VUSA", value: 750 },
          { key: "btc", label: "BTC", value: 250 },
        ]}
      />
    )

    const bar = container.querySelector('[data-slot="allocation-bar"] > svg')
    expect(widths(bar as HTMLElement)).toEqual([750, 250])
  })

  it("takes every colour from the one scale it is handed", () => {
    const colors = createSeriesColors(["btc", "vusa"])
    const { container } = render(
      <AllocationBar
        label="Allocation"
        colors={colors}
        segments={[
          { key: "vusa", label: "VUSA", value: 750 },
          { key: "btc", label: "BTC", value: 250 },
        ]}
      />
    )

    const barFills = Array.from(
      container.querySelectorAll('[data-slot="allocation-bar"] > svg rect')
    ).map((rect) => rect.getAttribute("fill"))
    const swatchFills = Array.from(
      container.querySelectorAll('[data-slot="series-swatch"] rect')
    ).map((rect) => rect.getAttribute("fill"))

    expect(barFills).toEqual([colors.colorFor("vusa"), colors.colorFor("btc")])
    expect(swatchFills).toEqual(barFills)
    expect(colors.colorFor("btc")).toBe("var(--color-chart-1)")
  })

  it("buckets everything past the palette into one Other slice", () => {
    const segments = Array.from({ length: 11 }, (_, index) => ({
      key: `asset-${index}`,
      label: `Asset ${index}`,
      value: 100 - index,
    }))

    const { container } = render(
      <AllocationBar
        label="Allocation"
        colors={createSeriesColors(segments.map((segment) => segment.key))}
        segments={segments}
      />
    )

    expect(
      container.querySelectorAll('[data-slot="allocation-bar"] > svg rect')
    ).toHaveLength(8)
    expect(screen.getByText("Other (4)")).toBeInTheDocument()
  })

  it("prints each share as a percentage figure", () => {
    render(
      <AllocationBar
        label="Allocation"
        colors={createSeriesColors(["vusa", "btc"])}
        segments={[
          { key: "vusa", label: "VUSA", value: 3 },
          { key: "btc", label: "BTC", value: 1 },
        ]}
      />
    )

    expect(screen.getByText("75.0%")).toBeInTheDocument()
    expect(screen.getByText("25.0%")).toBeInTheDocument()
  })

  it("renders nothing rather than an empty track", () => {
    const { container } = render(
      <AllocationBar
        label="Allocation"
        colors={createSeriesColors([])}
        segments={[]}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})

describe("ShareBar", () => {
  it("uses the holding's series colour on a row micro-bar", () => {
    const { container } = render(
      <ShareBar
        value={0.25}
        label="25% of the portfolio"
        color="var(--color-chart-3)"
      />
    )

    const fill = container.querySelector('[data-slot="share-bar-fill"]')
    expect(fill).toHaveStyle({ width: "25%" })
    expect(fill?.getAttribute("style")).toContain("var(--color-chart-3)")
  })

  it("prints the percentage beside a pivot bar and clamps out-of-range shares", () => {
    render(<ShareBar value={1.4} variant="pivot" label="Share of the group" />)

    expect(screen.getByText("100.0%")).toBeInTheDocument()
  })

  it("labels the track for assistive technology", () => {
    render(<ShareBar value={0.4} label="40% of the portfolio" />)

    expect(
      screen.getByRole("img", { name: "40% of the portfolio" })
    ).toBeInTheDocument()
  })
})
