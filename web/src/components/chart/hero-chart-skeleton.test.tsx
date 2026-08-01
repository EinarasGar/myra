import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { HeroChartSkeleton } from "./hero-chart-skeleton"

describe("HeroChartSkeleton", () => {
  it("announces the load without a selector when the screen owns no period", () => {
    const { container } = render(
      <HeroChartSkeleton label="Loading net worth" />
    )

    expect(screen.getByRole("status")).toHaveTextContent("Loading net worth")
    expect(container.querySelector('[data-slot="period-selector"]')).toBeNull()
  })

  it("keeps the period selector live while the next range loads", async () => {
    const onPeriodChange = vi.fn()
    render(<HeroChartSkeleton period="1d" onPeriodChange={onPeriodChange} />)

    expect(screen.getByRole("button", { name: "1D" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )

    fireEvent.click(screen.getByRole("button", { name: "1Y" }))
    await waitFor(() => expect(onPeriodChange).toHaveBeenCalledWith("1y"))
  })

  it("stays static so nothing animates over a pending fetch", () => {
    const { container } = render(<HeroChartSkeleton />)

    const section = container.querySelector(
      '[data-slot="hero-chart-skeleton"]'
    ) as HTMLElement
    expect(section).toHaveAttribute("aria-busy", "true")
    expect(section.innerHTML).not.toMatch(/animate-|animate-pulse/)
  })
})
