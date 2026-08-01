import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { PortfolioOverviewView } from "@/features/portfolio/api"
import type { AssetRef } from "@/lib/domain/refs"

const overviewView = vi.fn<() => PortfolioOverviewView>()
const customAsset = vi.fn<() => AssetRef | null>()

vi.mock("@/features/portfolio/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/portfolio/api")>()),
  useRequiredBaseAssetId: () => 45,
  useAssetOverviewSuspense: () => overviewView(),
}))

vi.mock("@/features/assets/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/assets/api")>()),
  assetTypesQueryOptions: () => ({
    queryKey: ["test", "asset-types"],
    queryFn: () => [{ id: 8, name: "Real Estate" }],
  }),
  useCustomAssetRef: () => customAsset(),
}))

vi.mock("@/features/assets", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/assets")>()),
  CustomAssetPanel: ({ withChart }: { withChart: boolean }) => (
    <div data-testid="valuations">{withChart ? "with chart" : "no chart"}</div>
  ),
}))

const { assetOverviewFixture, emptyOverviewFixture, VWRP } =
  await import("./fixtures")
const { AssetScreen } = await import("./asset-screen")
const { renderPortfolio, stubViewport, VIEWPORTS } =
  await import("./test-harness")

const FLAT = 900

const FLAT_REF: AssetRef = {
  assetId: FLAT,
  ticker: "FLAT.LON",
  name: "Flat 12, Wren House E17",
  assetTypeId: 8,
}

beforeEach(() => {
  stubViewport(VIEWPORTS.full)
  overviewView.mockReturnValue(emptyOverviewFixture())
  customAsset.mockReturnValue(FLAT_REF)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("AssetScreen for a custom asset", () => {
  it("names an unheld custom asset instead of calling it Asset 900", async () => {
    await renderPortfolio(<AssetScreen assetId={FLAT} />)

    expect(
      screen.getByRole("heading", { name: "FLAT.LON" })
    ).toBeInTheDocument()
    expect(screen.getByText("Flat 12, Wren House E17")).toBeInTheDocument()
    expect(await screen.findByText("Real Estate")).toBeInTheDocument()
  })

  it("gives an unheld custom asset its valuations and the chart", async () => {
    await renderPortfolio(<AssetScreen assetId={FLAT} />)

    expect(screen.getByTestId("valuations")).toHaveTextContent("with chart")
  })

  it("keeps saying it is unheld, without that being the whole page", async () => {
    await renderPortfolio(<AssetScreen assetId={FLAT} />)

    expect(screen.getByText("You do not hold this asset")).toBeInTheDocument()
    expect(
      screen.getByText(/The valuations above still stand/)
    ).toBeInTheDocument()
  })

  it("adds valuations under the holding, with no second chart", async () => {
    overviewView.mockReturnValue(assetOverviewFixture())
    customAsset.mockReturnValue({
      assetId: VWRP,
      ticker: "VWRP.LSE",
      name: "Vanguard FTSE All-World",
      assetTypeId: 5,
    })

    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    expect(screen.getByTestId("valuations")).toHaveTextContent("no chart")
  })

  it("leaves a market-priced asset it does not hold exactly as it was", async () => {
    customAsset.mockReturnValue(null)

    await renderPortfolio(<AssetScreen assetId={FLAT} />)

    expect(screen.queryByTestId("valuations")).not.toBeInTheDocument()
    expect(screen.getByText("You do not hold this asset")).toBeInTheDocument()
  })
})
