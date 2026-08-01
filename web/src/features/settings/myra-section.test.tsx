import { cleanup, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getUsage = vi.fn()
const listBindings = vi.fn()
const getMe = vi.fn()

const ENDPOINTS: Record<string, unknown> = { getUsage, listBindings, getMe }

vi.mock("@/lib/api", () => ({
  api: () =>
    new Proxy(
      {},
      {
        get: (_target, name: string) =>
          ENDPOINTS[name] ?? (() => Promise.resolve({ data: {} })),
      }
    ),
  apiClient: { get: vi.fn(() => Promise.resolve({ data: {} })) },
}))

const { SettingsScreen } = await import("./settings-screen")
const { renderSettings, stubViewport, VIEWPORTS } =
  await import("./test-harness")
const { MYRA_PERMISSION_UNSTORED } = await import("./copy")

beforeEach(() => {
  vi.clearAllMocks()
  stubViewport(VIEWPORTS.full)
  getMe.mockResolvedValue({
    data: {
      user_id: "00000000-0000-0000-0000-000000000000",
      role: "user",
      onboarding_version: 1,
      default_asset: { id: 1, ticker: "GBP", name: "British Pound" },
      user_metadata: { username: "einaras" },
    },
  })
  listBindings.mockResolvedValue({ data: { bindings: [] } })
  getUsage.mockResolvedValue({
    data: {
      hourly: {
        input: { used: 38_420, limit: 120_000 },
        output: { used: 6_180, limit: 20_000 },
        reset_at: new Date(Date.now() + 24 * 60_000).toISOString(),
      },
      monthly: {
        input: { used: 2_412_880, limit: 4_000_000 },
        output: { used: 412_400, limit: 600_000 },
        reset_at: new Date(Date.now() + 40 * 24 * 3_600_000).toISOString(),
      },
    },
  })
})

afterEach(cleanup)

describe("the Myra quota block", () => {
  it("draws one bar per metric per window, from the real usage endpoint", async () => {
    await renderSettings(<SettingsScreen section="myra" />)
    await screen.findByText("Hourly")
    expect(screen.getAllByRole("progressbar")).toHaveLength(4)
  })

  it("prints used, limit and share as separate figures", async () => {
    await renderSettings(<SettingsScreen section="myra" />)
    await screen.findByText("Hourly")
    expect(screen.getByText("38,420")).toBeInTheDocument()
    expect(screen.getByText("120,000")).toBeInTheDocument()
    expect(screen.getAllByText("32%").length).toBeGreaterThan(0)
  })

  it("counts down to the reset it was told about", async () => {
    await renderSettings(<SettingsScreen section="myra" />)
    expect(await screen.findByText("resets in 24 minutes")).toBeInTheDocument()
  })

  it("escalates the bar tone as a window fills", async () => {
    await renderSettings(<SettingsScreen section="myra" />)
    await screen.findByText("Monthly")
    const bars = screen.getAllByRole("progressbar")
    expect(bars.at(-1)?.firstElementChild?.className).toContain("bg-attention")
    expect(bars[0]?.firstElementChild?.className).toContain("bg-brand")
  })
})

describe("what Myra may do", () => {
  it("states the structural rule with no switch at all", async () => {
    await renderSettings(<SettingsScreen section="myra" />)
    const row = await screen.findByText("Approval required for every write")
    expect(row).toBeInTheDocument()
    expect(
      screen.getByText(/structural and cannot be switched off/)
    ).toBeVisible()
  })

  it("never lets a placeholder switch look like it persists", async () => {
    await renderSettings(<SettingsScreen section="myra" />)
    await screen.findByText("Read receipts I upload")

    const switches = screen.getAllByRole("switch")
    expect(switches).toHaveLength(2)
    for (const control of switches) {
      expect(control).toHaveAttribute("aria-disabled", "true")
      expect(control).toHaveAttribute("data-disabled")
    }
    expect(
      screen.getAllByText(new RegExp(MYRA_PERMISSION_UNSTORED.slice(0, 40)))
    ).toHaveLength(2)
  })

  it("marks both placeholder rows so a screenshot stays auditable", async () => {
    await renderSettings(<SettingsScreen section="myra" />)
    await screen.findByText("Read receipts I upload")
    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-mock="settings.myra-permissions"]')
          .length
      ).toBeGreaterThanOrEqual(4)
    })
    expect(screen.getAllByText("Not stored")).toHaveLength(2)
  })
})
