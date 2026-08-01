import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getMe = vi.fn()
const searchAssets = vi.fn()
const getAssetPairConverted = vi.fn()
const postBaseAsset = vi.fn()
const listBindings = vi.fn()
const listConnections = vi.fn()
const getUsage = vi.fn()

const ENDPOINTS: Record<string, unknown> = {
  getMe,
  searchAssets,
  getAssetPairConverted,
  postBaseAsset,
  listBindings,
  listConnections,
  getUsage,
}

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
const { BASE_CURRENCY_CONSEQUENCE, ACCOUNT_DANGER_TITLE } =
  await import("./copy")
const { SETTINGS_SECTIONS } = await import("./nav")

const CURRENCIES = [
  { asset_id: 1, ticker: "GBP", name: "British Pound", asset_type: 1 },
  { asset_id: 2, ticker: "EUR", name: "Euro", asset_type: 1 },
  { asset_id: 3, ticker: "USD", name: "US Dollar", asset_type: 1 },
]

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
  searchAssets.mockResolvedValue({
    data: { results: CURRENCIES, total_results: 168 },
  })
  getAssetPairConverted.mockResolvedValue({
    data: { latest_rate: 1.1642, last_updated: 1_780_000_000 },
  })
  postBaseAsset.mockResolvedValue({ data: {} })
  listBindings.mockResolvedValue({ data: { bindings: [] } })
  listConnections.mockResolvedValue({ data: { connections: [] } })
  getUsage.mockResolvedValue({
    data: {
      hourly: {
        input: { used: 1, limit: 10 },
        output: { used: 1, limit: 10 },
        reset_at: "2030-01-01T00:00:00Z",
      },
      monthly: {
        input: { used: 1, limit: 10 },
        output: { used: 1, limit: 10 },
        reset_at: "2030-01-01T00:00:00Z",
      },
    },
  })
})

afterEach(cleanup)

describe("the settings area", () => {
  it("offers every section from a rail on the page itself", async () => {
    await renderSettings(<SettingsScreen section="general" />)

    const rail = screen.getByRole("navigation", { name: "Settings sections" })
    expect(
      ["General", "Categories & assets", "Connections", "Myra"].map((label) =>
        within(rail).getByRole("link", { name: label }).getAttribute("href")
      )
    ).toEqual([
      "/settings?section=general",
      "/settings?section=categories",
      "/settings?section=connections",
      "/settings?section=myra",
    ])
  })

  it("marks the section it is showing", async () => {
    await renderSettings(<SettingsScreen section="myra" />)
    const rail = screen.getByRole("navigation", { name: "Settings sections" })
    expect(within(rail).getByRole("link", { name: "Myra" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(
      within(rail).getByRole("link", { name: "General" })
    ).not.toHaveAttribute("aria-current")
  })

  it("titles and introduces the section it is showing", async () => {
    await renderSettings(<SettingsScreen section="general" />)
    expect(
      screen.getByRole("heading", { level: 1, name: "General" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Changing the base currency re-converts/)
    ).toBeInTheDocument()
  })
})

describe("the base currency picker", () => {
  it("lists currencies, marks the current one and prices the rest against it", async () => {
    await renderSettings(<SettingsScreen section="general" />)

    const current = await screen.findByRole("button", {
      name: /GBP British Pound — your base currency/,
    })
    expect(current).toBeDisabled()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /EUR Euro/ })).toBeEnabled()
    })
    expect(screen.getAllByText("1 GBP =").length).toBeGreaterThan(0)
    expect(screen.getAllByText("1.1642").length).toBeGreaterThan(0)
  })

  it("states the consequence under the control, not in a tooltip", async () => {
    await renderSettings(<SettingsScreen section="general" />)
    const note = await screen.findByText(
      new RegExp(BASE_CURRENCY_CONSEQUENCE.slice(0, 40))
    )
    expect(note).toBeVisible()
    expect(note.getAttribute("title")).toBeNull()
  })

  it("says how much of the list it is showing and how the rates were fetched", async () => {
    await renderSettings(<SettingsScreen section="general" />)
    expect(
      await screen.findByText(/Showing 3 of 168 currencies/)
    ).toBeInTheDocument()
  })

  it("counts only what the search returned, not the currency it pins on top", async () => {
    searchAssets.mockResolvedValue({
      data: {
        results: [
          { asset_id: 3, ticker: "USD", name: "US Dollar", asset_type: 1 },
        ],
        total_results: 1,
      },
    })
    await renderSettings(<SettingsScreen section="general" />)

    expect(
      await screen.findByText(/Showing 1 of 1 currencies/)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /— your base currency/ })
    ).toBeInTheDocument()
  })

  it("changes the base currency when another one is chosen", async () => {
    await renderSettings(<SettingsScreen section="general" />)
    const euro = await screen.findByRole("button", { name: /EUR Euro/ })
    fireEvent.click(euro)
    await waitFor(() => {
      expect(postBaseAsset).toHaveBeenCalledWith(
        "00000000-0000-0000-0000-000000000000",
        { asset_id: 2 }
      )
    })
  })

  it("shows an em dash rather than a rate it could not fetch", async () => {
    getAssetPairConverted.mockResolvedValue({ data: {} })
    await renderSettings(<SettingsScreen section="general" />)
    await waitFor(() => {
      expect(
        screen.getAllByLabelText(/No rate path to your base currency/).length
      ).toBeGreaterThan(0)
    })
  })
})

describe("the danger zone on General", () => {
  it("says deletion does not exist rather than offering a button that does nothing", async () => {
    await renderSettings(<SettingsScreen section="general" />)
    expect(await screen.findByText(ACCOUNT_DANGER_TITLE)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /delete my account/i })
    ).toBeNull()
    expect(screen.queryByRole("button", { name: /export/i })).toBeNull()
  })
})

describe("every width", () => {
  it.each(Object.entries(VIEWPORTS))(
    "keeps the rail and the section reachable at %s",
    async (_width, viewport) => {
      stubViewport(viewport)
      await renderSettings(<SettingsScreen section="general" />)
      const rail = screen.getByRole("navigation", { name: "Settings sections" })
      expect(within(rail).getAllByRole("link")).toHaveLength(
        SETTINGS_SECTIONS.length
      )
      expect(
        screen.getByRole("heading", { level: 1, name: "General" })
      ).toBeInTheDocument()
      cleanup()
    }
  )
})
