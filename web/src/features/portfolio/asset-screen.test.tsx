import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PortfolioOverviewView } from "@/features/portfolio/api"

const overviewView = vi.fn<() => PortfolioOverviewView>()

vi.mock("@/features/portfolio/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/portfolio/api")>()),
  useRequiredBaseAssetId: () => 1,
  useAssetOverviewSuspense: () => overviewView(),
}))

vi.mock("@/features/assets/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/assets/api")>()),
  assetTypesQueryOptions: () => ({
    queryKey: ["test", "asset-types"],
    queryFn: () => [{ id: 5, name: "ETF" }],
  }),
  assetConvertedRatesQueryOptions: () => ({
    queryKey: ["test", "asset-rates"],
    queryFn: () => [
      { date: new Date("2026-05-01T00:00:00Z"), rate: 96 },
      { date: new Date("2026-07-01T00:00:00Z"), rate: 102.4 },
    ],
  }),
  useCustomAssetRef: () => null,
}))

const { assetOverviewFixture, emptyOverviewFixture, VWRP } =
  await import("./fixtures")
const { AssetScreen } = await import("./asset-screen")
const { renderPortfolio, stubViewport, VIEWPORTS } =
  await import("./test-harness")

beforeEach(() => {
  stubViewport(VIEWPORTS.full)
  overviewView.mockReturnValue(assetOverviewFixture())
})

function lotsTable() {
  return screen.getByRole("table", { name: "Purchase lots" })
}

function lotRows() {
  return within(lotsTable()).getAllByRole("row")
}

describe("AssetScreen", () => {
  it("names the asset, its type and the way back", async () => {
    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    expect(
      screen.getByRole("heading", { name: "VWRP.LSE" })
    ).toBeInTheDocument()
    expect(await screen.findByText("ETF")).toBeInTheDocument()
    expect(screen.getByText("Vanguard FTSE All-World")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "← Portfolio" })).toHaveAttribute(
      "href",
      "/portfolio"
    )
  })

  it("draws the average cost on the price line and a ring for every lot", async () => {
    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    expect(await screen.findByText(/avg cost £94\.29/)).toBeInTheDocument()
    expect(
      screen.getByText(/The rings are your 3 purchase lots/)
    ).toBeInTheDocument()
  })

  it("counts only lot events the API really reports", async () => {
    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    expect(screen.getByText("across 1 of 3 lots")).toBeInTheDocument()
    expect(screen.getByText("across 3 lots")).toBeInTheDocument()
    expect(screen.getByText("no dividend lots")).toBeInTheDocument()
  })

  it("prints the lifetime tiles from the overview it already has", async () => {
    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    const value = document.querySelector('[data-tile="Value"]')
    expect(value?.textContent).toContain("£3,891.20")
    expect(
      document.querySelector('[data-tile="Cost basis"]')?.textContent
    ).toContain("£4,525.80")
  })

  it("keeps a closed lot listed, dimmed, and labelled", async () => {
    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    const closed = lotRows().find(
      (row) => row.getAttribute("data-closed") === "true"
    )
    expect(closed).toBeDefined()
    expect(within(closed!).getByText("Closed")).toBeInTheDocument()
    expect(closed).toHaveAttribute("data-variant", "ghost")
  })

  it("keeps a closed lot's realised gain in full colour and refuses it a percentage", async () => {
    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    const closed = lotRows().find(
      (row) => row.getAttribute("data-closed") === "true"
    )!
    const tones = [...closed.querySelectorAll("[data-figure][data-tone]")].map(
      (figure) => ({
        tone: figure.getAttribute("data-tone"),
        text: figure.textContent,
      })
    )
    expect(tones).toContainEqual({ tone: "positive", text: "+£64.00" })
    expect(tones).toContainEqual({ tone: "ghost", text: "£882.00" })
    expect(
      within(closed).getByLabelText("Not applicable to a closed lot")
    ).toBeInTheDocument()
  })

  it("says the FIFO queue is per account rather than claiming one across them", async () => {
    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    const footnote = screen.getByText(/Sales close the oldest lot first/)
    expect(footnote.textContent).toContain("within each account")
    expect(footnote.textContent).toContain("not one cross-account queue")
  })

  it("totals the lot table inside the panel that holds it", async () => {
    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    const totals = lotRows().find(
      (row) => row.getAttribute("data-variant") === "totals"
    )
    expect(totals).toBeDefined()
    expect(within(totals!).getByText("2 open, 1 closed")).toBeInTheDocument()
  })

  it("refuses the page rather than drawing an empty lot ledger", async () => {
    overviewView.mockReturnValue(emptyOverviewFixture())
    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    expect(screen.getByText("You do not hold this asset")).toBeInTheDocument()
    expect(screen.queryByRole("table", { name: "Purchase lots" })).toBeNull()
  })

  it("sheds the % and fee columns first and keeps Total at every width", async () => {
    stubViewport(VIEWPORTS.tight)
    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    expect(screen.queryByRole("columnheader", { name: "Fees" })).toBeNull()
    expect(screen.queryByRole("columnheader", { name: "%" })).toBeNull()
    expect(
      screen.getByRole("columnheader", { name: "Unrealised" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Total" })
    ).toBeInTheDocument()
  })

  it("keeps Bought, Account and Total on a phone and moves the rest into the row", async () => {
    stubViewport(VIEWPORTS.phone)
    await renderPortfolio(<AssetScreen assetId={VWRP} />)

    expect(
      within(lotsTable())
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent)
    ).toEqual(["Bought", "Account", "Total"])
    expect(within(lotsTable()).getAllByText(/left · cost/).length).toBe(3)
  })
})
