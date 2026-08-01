import { describe, expect, it } from "vitest"

import publishedReport from "../../../MOCK_DATA.md?raw"

import { mockRegistry } from "./registry"
import { renderMockReport } from "./report"
import { MOCK_SCREEN_TITLES } from "./types"

describe("MOCK_DATA.md", () => {
  it("is exactly what the registry renders", () => {
    expect(publishedReport).toBe(renderMockReport())
  })

  it("documents every registered mock", () => {
    for (const entry of mockRegistry) {
      expect(publishedReport).toContain(entry.id)
      expect(publishedReport).toContain(entry.surface)
      expect(publishedReport).toContain(entry.standsInFor)
      expect(publishedReport).toContain(entry.backendWork)
      expect(publishedReport).toContain(MOCK_SCREEN_TITLES[entry.screen])
      for (const name of entry.exports) {
        expect(publishedReport).toContain(name)
      }
    }
  })

  it("would fail if an entry were added without regenerating", () => {
    const extra = [
      ...mockRegistry,
      {
        ...mockRegistry[0]!,
        id: "dashboard.unpublished",
        surface: "A surface nobody documented",
      },
    ]
    expect(renderMockReport(extra)).not.toBe(publishedReport)
    expect(renderMockReport(extra)).toContain("dashboard.unpublished")
  })
})

describe("renderMockReport", () => {
  it("groups by screen and skips screens with no mocks", () => {
    const report = renderMockReport()
    expect(report).toContain(`## ${MOCK_SCREEN_TITLES.portfolio}`)
    expect(report).not.toContain(`## ${MOCK_SCREEN_TITLES.myra}`)
    expect(report.indexOf("## Dashboard")).toBeLessThan(
      report.indexOf("## Portfolio & assets")
    )
  })

  it("counts every entry once in the summary", () => {
    expect(renderMockReport()).toContain(
      `${mockRegistry.length} mocked surfaces`
    )
  })
})
