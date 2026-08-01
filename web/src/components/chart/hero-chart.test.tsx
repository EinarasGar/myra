import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { HeroChart, type HeroChartProps } from "./hero-chart"
import type { ChartPoint } from "./chart-data"

type MoneyChartProps = Extract<HeroChartProps, { currency: string }>

const DAY = 24 * 60 * 60 * 1000
const START = new Date(2026, 6, 24).getTime()

const SERIES: ChartPoint[] = [
  { date: START, value: 100 },
  { date: START + DAY, value: 110 },
  { date: START + 2 * DAY, value: 120 },
]

function slotsIn(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("[data-slot]")).map(
    (element) => element.getAttribute("data-slot") ?? ""
  )
}

function renderChart(props: Partial<MoneyChartProps> = {}) {
  return render(
    <HeroChart
      data={SERIES}
      label="Net worth"
      currency="GBP"
      period="1m"
      onPeriodChange={() => {}}
      {...props}
    />
  )
}

describe("HeroChart header", () => {
  it("prints the last value, the period delta and the period note", () => {
    renderChart()

    const value = document.querySelector('[data-slot="hero-chart-value"]')
    const delta = document.querySelector('[data-slot="hero-chart-delta"]')

    expect(value?.textContent).toContain("120.00")
    expect(delta?.textContent).toContain("20.00")
    expect(delta?.textContent).toContain("20.0%")
    expect(delta?.textContent).toContain("over 2 days")
  })

  it("keeps every header slot in place while scrubbing", async () => {
    const { container } = renderChart()
    const header = container.querySelector(
      '[data-slot="hero-chart-header"]'
    ) as HTMLElement

    const before = slotsIn(header)
    const valueBefore = header.querySelector('[data-slot="hero-chart-value"]')
    const noteBefore = header.querySelector('[data-slot="hero-chart-note"]')

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowLeft" })

    await waitFor(() =>
      expect(
        container
          .querySelector('[data-slot="hero-chart"]')
          ?.getAttribute("data-scrubbing")
      ).toBe("true")
    )

    expect(slotsIn(header)).toEqual(before)
    expect(header.querySelector('[data-slot="hero-chart-value"]')).toBe(
      valueBefore
    )
    expect(header.querySelector('[data-slot="hero-chart-note"]')).toBe(
      noteBefore
    )
  })

  it("cuts the figure to the scrubbed point and dates the note", async () => {
    const { container } = renderChart()

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowLeft" })

    await waitFor(() =>
      expect(
        container.querySelector('[data-slot="hero-chart-value"]')?.textContent
      ).toContain("110.00")
    )
    expect(
      container.querySelector('[data-slot="hero-chart-note"]')?.textContent
    ).toContain("25 Jul 2026")
    expect(
      container.querySelector('[data-slot="hero-chart-delta"]')?.textContent
    ).toContain("10.00")
  })

  it("returns to the period summary when the pointer leaves", async () => {
    const { container } = renderChart()
    const scrubber = screen.getByRole("slider")

    fireEvent.keyDown(scrubber, { key: "Home" })
    await waitFor(() =>
      expect(
        container.querySelector('[data-slot="hero-chart-value"]')?.textContent
      ).toContain("100.00")
    )

    fireEvent.pointerLeave(scrubber)
    await waitFor(() =>
      expect(
        container.querySelector('[data-slot="hero-chart-value"]')?.textContent
      ).toContain("120.00")
    )
  })

  it("never animates a number", () => {
    const { container } = renderChart()
    const figures = container.querySelectorAll("[data-figure]")

    expect(figures.length).toBeGreaterThan(0)
    for (const figure of figures) {
      expect(figure.className).not.toMatch(/transition|animate|duration/)
    }
  })
})

describe("HeroChart draw-in", () => {
  it("draws in once and stays drawn when the data is refetched", async () => {
    const { container, rerender } = render(
      <HeroChart data={SERIES} currency="GBP" />
    )
    const plot = () =>
      container.querySelector('[data-slot="hero-chart-draw"]') as HTMLElement

    expect(plot().getAttribute("data-drawn")).toBe("false")
    await waitFor(() => expect(plot().getAttribute("data-drawn")).toBe("true"))

    rerender(
      <HeroChart
        data={SERIES.map((point) => ({
          ...point,
          value: (point.value ?? 0) + 5,
        }))}
        currency="GBP"
      />
    )

    expect(plot().getAttribute("data-drawn")).toBe("true")
    expect(plot().style.clipPath).toBe("inset(0 0 0 0)")
  })

  it("expresses the draw-in as a css transition so reduced motion collapses it", async () => {
    const { container } = renderChart()
    const plot = container.querySelector(
      '[data-slot="hero-chart-draw"]'
    ) as HTMLElement

    await waitFor(() => expect(plot.getAttribute("data-drawn")).toBe("true"))

    expect(plot.className).toContain("transition-[clip-path]")
    expect(plot.className).toContain("duration-sheet")
    expect(plot.className).toContain("ease-out-quick")
    expect(plot.className).not.toMatch(/animate-/)
  })

  it("waits for plottable data before playing the draw-in", () => {
    const { container } = render(<HeroChart data={[]} currency="GBP" />)

    expect(container.querySelector('[data-slot="hero-chart-draw"]')).toBeNull()
  })
})

describe("HeroChart states", () => {
  it("shows an empty box but keeps the period selector so the range is escapable", () => {
    const { container } = renderChart({
      data: [],
      emptyLabel: "No history yet",
    })

    expect(container.querySelector('[data-slot="hero-chart"]')).toHaveAttribute(
      "data-state",
      "empty"
    )
    expect(screen.getByText("No history yet")).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="period-selector"]')
    ).not.toBeNull()
  })

  it("keeps the period selector when a range returns a single point", async () => {
    const onPeriodChange = vi.fn()
    const { container } = renderChart({
      data: [{ date: START, value: 100 }],
      period: "1d",
      onPeriodChange,
    })

    expect(container.querySelector('[data-slot="hero-chart"]')).toHaveAttribute(
      "data-state",
      "empty"
    )

    fireEvent.click(screen.getByRole("button", { name: "1M" }))
    await waitFor(() => expect(onPeriodChange).toHaveBeenCalledWith("1m"))
  })

  it("keeps the period selector while the degraded note is shown", () => {
    const { container } = renderChart({
      data: [],
      degraded: "Prices are unavailable for this range",
    })

    expect(
      container.querySelector('[data-slot="period-selector"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-slot="hero-chart-degraded"]')
    ).not.toBeNull()
  })

  it("annotates a degraded series without hiding it", () => {
    const { container } = renderChart({
      degraded: "Prices last updated 3 hours ago",
    })

    expect(container.querySelector('[data-slot="hero-chart"]')).toHaveAttribute(
      "data-degraded",
      "true"
    )
    expect(
      screen.getByText("Prices last updated 3 hours ago")
    ).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="hero-chart-draw"]')
    ).not.toBeNull()
  })

  it("renders a rate series with no currency in play", () => {
    const { container } = render(<HeroChart data={SERIES} kind="rate" />)

    expect(
      container.querySelector('[data-slot="hero-chart-value"]')?.textContent
    ).toContain("120")
    expect(
      container.querySelector('[data-slot="hero-chart-value"]')?.textContent
    ).not.toContain("£")
  })

  it("marks a liability chart so it reads debt-shaped", () => {
    const { container } = renderChart({
      shape: "liability",
      data: [
        { date: START, value: -210000 },
        { date: START + DAY, value: -144722 },
      ],
    })

    expect(container.querySelector('[data-slot="hero-chart"]')).toHaveAttribute(
      "data-shape",
      "liability"
    )
  })

  it("labels the scrubber for assistive technology", async () => {
    renderChart()
    const scrubber = screen.getByRole("slider")

    expect(scrubber).toHaveAttribute("aria-valuemin", "0")
    expect(scrubber).toHaveAttribute("aria-valuemax", "2")

    fireEvent.keyDown(scrubber, { key: "Home" })
    await waitFor(() =>
      expect(scrubber.getAttribute("aria-valuetext")).toContain("24 Jul 2026")
    )
    expect(scrubber.getAttribute("aria-valuetext")).toContain("100.00")
  })
})

describe("period selector", () => {
  it("reports the API range enum and underlines the active period", async () => {
    const onPeriodChange = vi.fn()
    renderChart({ onPeriodChange })

    const active = screen.getByRole("button", { name: "1M" })
    expect(active).toHaveAttribute("aria-pressed", "true")
    expect(active.className).toContain("aria-pressed:border-brand")

    fireEvent.click(screen.getByRole("button", { name: "ALL" }))
    await waitFor(() => expect(onPeriodChange).toHaveBeenCalledWith("all"))
  })

  it("offers exactly the seven server ranges", () => {
    renderChart()

    expect(
      screen.getAllByRole("button").map((button) => button.textContent)
    ).toEqual(["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"])
  })
})
