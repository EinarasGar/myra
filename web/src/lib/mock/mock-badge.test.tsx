import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  areMockMarkersVisible,
  mockAttributes,
  mockMarkerProps,
  mockTitle,
} from "./markers"
import { MockBadge } from "./mock-badge"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("mock markers", () => {
  it("renders a badge that discloses the figures as an example in plain words", () => {
    render(<MockBadge id="dashboard.attribution" />)
    const badge = screen.getByText("Example")
    expect(badge).toHaveAttribute("data-mock", "dashboard.attribution")
    expect(badge).toHaveAttribute("title", mockTitle("dashboard.attribution"))
    expect(badge.getAttribute("title")).toContain("not read from your ledger")
  })

  it("takes a label and merges class names", () => {
    render(
      <MockBadge
        id="portfolio.period-column"
        label="Example 30d"
        className="ml-2"
      />
    )
    const badge = screen.getByText("Example 30d")
    expect(badge.className).toContain("ml-2")
    expect(badge.className).toContain("bg-attention-dim")
  })

  it("marks a surface through data attributes", () => {
    expect(mockAttributes("accounts.deactivated-fold")).toEqual({
      "data-mock": "accounts.deactivated-fold",
    })
    expect(areMockMarkersVisible()).toBe(true)
  })

  it("marks an optional seam only while it is mocked", () => {
    expect(mockMarkerProps("accounts.deactivated-fold")).toEqual({
      "data-mock": "accounts.deactivated-fold",
      title: mockTitle("accounts.deactivated-fold"),
    })
    expect(mockMarkerProps(null)).toEqual({})
  })

  it("carries no colour literal and no animation", () => {
    render(<MockBadge id="settings.myra-permissions" />)
    const className = screen.getByText("Example").className
    expect(className).not.toMatch(/oklch|#[0-9a-f]{3,8}|rgb\(/i)
    expect(className).not.toMatch(/animate-|transition-/)
  })
})

describe("mock markers in a production build", () => {
  it("still renders the badge, because an invented figure must never look real", () => {
    vi.stubEnv("DEV", false)
    vi.stubEnv("PROD", true)
    expect(areMockMarkersVisible()).toBe(true)
    render(<MockBadge id="dashboard.attribution" />)
    expect(screen.getByText("Example")).toHaveAttribute(
      "data-mock",
      "dashboard.attribution"
    )
  })
})

describe("mock markers with screenshots in mind", () => {
  it("hides the visible badge when the build asks for it", () => {
    vi.stubEnv("VITE_HIDE_MOCK_MARKERS", "true")
    expect(areMockMarkersVisible()).toBe(false)
    const { container } = render(<MockBadge id="dashboard.attribution" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("keeps data-mock on the surface even then, so a build is still auditable", () => {
    vi.stubEnv("VITE_HIDE_MOCK_MARKERS", "true")
    expect(mockAttributes("dashboard.attribution")).toEqual({
      "data-mock": "dashboard.attribution",
    })
  })
})
