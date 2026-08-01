import { describe, expect, it } from "vitest"

import { MOCK_LANDING_SNAPSHOT } from "@/lib/mock"

import { sparkGeometry } from "./spark"

describe("sparkGeometry", () => {
  it("spans the full viewBox and closes the area under the line", () => {
    const { line, area, viewBox } = sparkGeometry([1, 2, 3], 100, 50)
    expect(viewBox).toBe("0 0 100 50")
    expect(line.startsWith("M0,")).toBe(true)
    expect(area.endsWith("L100,50 L0,50 Z")).toBe(true)
  })

  it("keeps the extremes inside the box for the landing series", () => {
    const { line } = sparkGeometry(
      MOCK_LANDING_SNAPSHOT.chart.points,
      1000,
      170
    )
    const ys = [...line.matchAll(/[,\s](-?\d+(?:\.\d+)?)(?=[\s]|$)/g)].map(
      (match) => Number(match[1])
    )
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...ys)).toBeLessThanOrEqual(170)
  })

  it("degrades to an empty path rather than throwing on a short series", () => {
    expect(sparkGeometry([1], 100, 50)).toEqual({
      line: "",
      area: "",
      viewBox: "0 0 100 50",
    })
  })
})
