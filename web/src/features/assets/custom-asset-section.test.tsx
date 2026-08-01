import { cleanup, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getUserAsset = vi.fn()
const getUserAssetPair = vi.fn()
const getUserAssetPairRates = vi.fn()
const postCustomAssetRates = vi.fn()
const deleteAssetPairRates = vi.fn()
const postAssetPair = vi.fn()
const deleteAssetPair = vi.fn()
const putCustomAssetPair = vi.fn()
const searchAssets = vi.fn()

const ENDPOINTS: Record<string, unknown> = {
  getUserAsset,
  getUserAssetPair,
  getUserAssetPairRates,
  postCustomAssetRates,
  deleteAssetPairRates,
  postAssetPair,
  deleteAssetPair,
  putCustomAssetPair,
  searchAssets,
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

const { CustomAssetSection } = await import("./custom-asset-section")
const { valuationFoldLabel } = await import("./valuation")
const { renderAssets, stubViewport, VIEWPORTS } = await import("./test-harness")

const FLAT = 900
const GBP = 45

const NOW = new Date(2026, 6, 31, 10, 0, 0)

function unix(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

function daysBefore(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000)
}

function assetDetail() {
  return {
    data: {
      ticker: "FLAT.LON",
      name: "Flat 12, Wren House E17",
      asset_type: { id: 8, name: "Real Estate" },
      base_asset: { asset_id: GBP, ticker: "GBP", name: "Pound Sterling" },
      pairs: [{ asset_id: GBP, ticker: "GBP", name: "Pound Sterling" }],
    },
  }
}

function pairWithQuote(asOf: Date | null, rate = 328_000) {
  return {
    data: {
      metadata:
        asOf === null ? {} : { latest_rate: rate, last_updated: unix(asOf) },
      user_metadata: null,
    },
  }
}

function ratesOn(dates: readonly Date[], rate = 328_000) {
  return {
    data: { rates: dates.map((date) => ({ date: unix(date), rate })) },
  }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(NOW)
  stubViewport(VIEWPORTS.full)
  getUserAsset.mockResolvedValue(assetDetail())
  getUserAssetPair.mockResolvedValue(pairWithQuote(daysBefore(2)))
  getUserAssetPairRates.mockResolvedValue(
    ratesOn([daysBefore(2), daysBefore(60)])
  )
  postCustomAssetRates.mockResolvedValue({ data: {} })
  deleteAssetPairRates.mockResolvedValue({ data: {} })
  postAssetPair.mockResolvedValue({ data: {} })
  deleteAssetPair.mockResolvedValue({ data: {} })
  putCustomAssetPair.mockResolvedValue({ data: {} })
  searchAssets.mockResolvedValue({
    data: { results: [], total_results: 0 },
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

function history() {
  return screen.getByRole("table", { name: "Valuations you entered" })
}

describe("CustomAssetSection", () => {
  it("lists the valuations you entered, newest first", async () => {
    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)

    const rows = await waitFor(() => within(history()).getAllByRole("row"))
    expect(rows[1]).toHaveTextContent("29 Jul 2026")
    expect(rows[2]).toHaveTextContent("1 Jun 2026")
  })

  it("pages a long valuation series instead of unrolling all of it", async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 100 }, (_, index) => daysBefore(index))
    getUserAssetPairRates.mockResolvedValue(ratesOn(many))

    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)

    await waitFor(() => history())
    const drawn = () => within(history()).getAllByRole("row").length - 2
    expect(drawn()).toBe(8)

    await user.click(
      screen.getByRole("button", { name: valuationFoldLabel(92) })
    )
    expect(drawn()).toBe(33)
  })

  it("says how old a stale valuation is and what still leans on it", async () => {
    getUserAssetPair.mockResolvedValue(pairWithQuote(daysBefore(200)))
    getUserAssetPairRates.mockResolvedValue(
      ratesOn([daysBefore(200), daysBefore(400)])
    )

    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)

    expect(
      await screen.findByText(/Last valued 12 Jan 2026 · 7 months ago/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/still use the figure you entered on 12 Jan 2026/)
    ).toBeInTheDocument()
  })

  it("does not cry stale over a valuation from this week", async () => {
    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)

    await waitFor(() => history())
    expect(screen.queryByText(/still use the figure/)).not.toBeInTheDocument()
  })

  it("names the never-valued case as degraded rather than empty", async () => {
    getUserAssetPair.mockResolvedValue(pairWithQuote(null))
    getUserAssetPairRates.mockResolvedValue(ratesOn([]))

    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)

    expect(
      await screen.findByText("This asset has never been valued")
    ).toBeInTheDocument()
    expect(
      screen.getByText(/counts as nothing in every total/)
    ).toBeInTheDocument()
  })

  it("saves a valuation on the date the plain-English field resolved", async () => {
    const user = userEvent.setup()
    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)
    await waitFor(() => history())

    await user.click(screen.getByRole("button", { name: "Add a valuation" }))
    const date = screen.getByLabelText("Valued on")
    await user.clear(date)
    await user.type(date, "5 days ago")
    await user.type(
      screen.getByLabelText(/What one FLAT.LON is worth in GBP/),
      "341000"
    )
    await user.click(screen.getByRole("button", { name: "Save valuation" }))

    await waitFor(() => {
      expect(postCustomAssetRates).toHaveBeenCalledWith(
        expect.any(String),
        FLAT,
        GBP,
        { rates: [{ date: unix(new Date(2026, 6, 26)), rate: 341_000 }] }
      )
    })
  })

  it("shows what a new rate does to the last one before it is saved", async () => {
    const user = userEvent.setup()
    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)
    await waitFor(() => history())

    await user.click(screen.getByRole("button", { name: "Add a valuation" }))
    await user.type(
      screen.getByLabelText(/What one FLAT.LON is worth in GBP/),
      "341000"
    )

    expect(
      await screen.findByText("That is up 4.0% on the last valuation.")
    ).toBeInTheDocument()
  })

  it("refuses a date it cannot read instead of guessing one", async () => {
    const user = userEvent.setup()
    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)
    await waitFor(() => history())

    await user.click(screen.getByRole("button", { name: "Add a valuation" }))
    const date = screen.getByLabelText("Valued on")
    await user.clear(date)
    await user.type(date, "whenever")
    await user.type(
      screen.getByLabelText(/What one FLAT.LON is worth in GBP/),
      "341000"
    )
    await user.click(screen.getByRole("button", { name: "Save valuation" }))

    expect(await screen.findByText(/could not be read/)).toBeInTheDocument()
    expect(postCustomAssetRates).not.toHaveBeenCalled()
  })

  it("removes one valuation by its own day, not a range around it", async () => {
    const user = userEvent.setup()
    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)

    const rows = await waitFor(() => within(history()).getAllByRole("row"))
    const first = rows[1] as HTMLElement
    await user.click(within(first).getByRole("button", { name: "Remove" }))

    const at = unix(daysBefore(2))
    await waitFor(() => {
      expect(deleteAssetPairRates).toHaveBeenCalledWith(
        expect.any(String),
        FLAT,
        GBP,
        at,
        at
      )
    })
  })

  it("offers an Undo that puts the removed valuation back", async () => {
    const user = userEvent.setup()
    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)

    const rows = await waitFor(() => within(history()).getAllByRole("row"))
    const first = rows[1] as HTMLElement
    await user.click(within(first).getByRole("button", { name: "Remove" }))

    const undo = await screen.findByRole("button", { name: "Undo" })
    await user.click(undo)

    await waitFor(() => {
      expect(postCustomAssetRates).toHaveBeenCalledWith(
        expect.any(String),
        FLAT,
        GBP,
        { rates: [{ date: unix(daysBefore(2)), rate: 328_000 }] }
      )
    })
  })

  it("says what a pair removal takes with it before doing it", async () => {
    const user = userEvent.setup()
    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)
    await waitFor(() => history())

    await user.click(screen.getByRole("button", { name: "Remove pair" }))

    expect(
      await screen.findByText(/Every valuation you entered against GBP goes/)
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Remove pair" }))
    await waitFor(() => {
      expect(deleteAssetPair).toHaveBeenCalledWith(
        expect.any(String),
        FLAT,
        GBP
      )
    })
  })

  it("records where a valuation came from against the pair", async () => {
    const user = userEvent.setup()
    await renderAssets(<CustomAssetSection assetId={FLAT} withChart />)
    await waitFor(() => history())

    await user.type(
      screen.getByLabelText("Where your valuations come from"),
      "Zoopla estimate"
    )
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(putCustomAssetPair).toHaveBeenCalledWith(
        expect.any(String),
        FLAT,
        GBP,
        { exchange: "Zoopla estimate" }
      )
    })
  })
})
