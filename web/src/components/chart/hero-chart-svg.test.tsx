import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ChartPoint } from "./chart-data"
import { HeroChart } from "./hero-chart"

const DAY = 24 * 60 * 60 * 1000
const START = new Date(2026, 6, 24).getTime()
const WIDTH = 800
const HEIGHT = 164

const RISING: ChartPoint[] = [
  { date: START, value: 100 },
  { date: START + DAY, value: 110 },
  { date: START + 2 * DAY, value: 120 },
]

const DEBT: ChartPoint[] = [
  { date: START, value: -210000 },
  { date: START + DAY, value: -180000 },
  { date: START + 2 * DAY, value: -144722 },
]

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private readonly callback: ResizeObserverCallback
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
      }
      observe(target: Element) {
        const contentRect = {
          width: WIDTH,
          height: HEIGHT,
          top: 0,
          left: 0,
          right: WIDTH,
          bottom: HEIGHT,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
        this.callback(
          [{ target, contentRect }] as unknown as ResizeObserverEntry[],
          this as unknown as ResizeObserver
        )
      }
      unobserve() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function lastPoint(path: string): { x: number; y: number } {
  const numbers = path
    .replace(/[A-Za-z]/g, " ")
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  const y = numbers.at(-1) ?? Number.NaN
  const x = numbers.at(-2) ?? Number.NaN
  return { x, y }
}

describe("HeroChart series", () => {
  it("strokes the line and fills the area in the brand token only", () => {
    const { container } = render(<HeroChart data={RISING} currency="GBP" />)

    const curve = container.querySelector(".recharts-area-curve")
    const area = container.querySelector(".recharts-area-area")

    expect(curve?.getAttribute("stroke")).toBe("var(--color-brand)")
    expect(curve?.getAttribute("stroke-width")).toBe("2")
    expect(area?.getAttribute("fill")).toBe("var(--color-brand)")
    expect(area?.getAttribute("fill-opacity")).toBe("0.12")
  })

  it("closes an asset area at the foot of the plot", () => {
    const { container } = render(<HeroChart data={RISING} currency="GBP" />)

    const area = container.querySelector(".recharts-area-area")
    expect(lastPoint(area?.getAttribute("d") ?? "").y).toBe(HEIGHT)
  })

  it("closes a liability area at zero so the line climbs toward it", () => {
    const { container } = render(
      <HeroChart data={DEBT} currency="GBP" shape="liability" />
    )

    const area = container.querySelector(".recharts-area-area")
    const curve = container.querySelector(".recharts-area-curve")

    expect(lastPoint(area?.getAttribute("d") ?? "").y).toBe(2)
    expect(lastPoint(curve?.getAttribute("d") ?? "").y).toBeLessThan(
      lastPoint(area?.getAttribute("d") ?? "").y + HEIGHT
    )
  })

  it("draws a cursor only while scrubbing", async () => {
    const { container } = render(<HeroChart data={RISING} currency="GBP" />)

    expect(container.querySelectorAll(".recharts-reference-line")).toHaveLength(
      0
    )

    fireEvent.keyDown(screen.getByRole("slider"), { key: "Home" })

    await waitFor(() =>
      expect(
        container.querySelectorAll(".recharts-reference-line").length
      ).toBeGreaterThan(0)
    )
    expect(
      container.querySelectorAll(".recharts-reference-dot").length
    ).toBeGreaterThan(0)
  })

  it("draws lot markers and the average-cost line with its label chip", () => {
    const { container } = render(
      <HeroChart
        data={RISING}
        currency="GBP"
        markers={[{ date: START + DAY, value: 110 }]}
        referenceLine={{ value: 110, label: "avg cost £110.00" }}
      />
    )

    expect(
      container.querySelectorAll(".recharts-reference-dot").length
    ).toBeGreaterThan(0)
    const line = container.querySelector(".recharts-reference-line line")
    expect(line?.getAttribute("stroke-dasharray")).toBe("4 4")
    expect(screen.getByText("avg cost £110.00")).toBeInTheDocument()
  })

  it("breaks the line across rate-less points instead of inventing one", () => {
    const { container } = render(
      <HeroChart
        currency="GBP"
        data={[
          { date: START, value: 100 },
          { date: START + DAY, value: 104 },
          { date: START + 2 * DAY, value: null },
          { date: START + 3 * DAY, value: 116 },
          { date: START + 4 * DAY, value: 120 },
        ]}
      />
    )

    const curve = container.querySelector(".recharts-area-curve")
    const moves = (curve?.getAttribute("d") ?? "").match(/M/g) ?? []
    expect(moves).toHaveLength(2)
  })
})
