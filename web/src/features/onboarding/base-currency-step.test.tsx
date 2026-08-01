import { Suspense } from "react"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const searchAssets = vi.fn()

vi.mock("@/lib/api", () => ({
  api: () => ({ searchAssets }),
  resolveApiUrl: (path: string) => `http://localhost:5000${path}`,
}))

const { BaseCurrencyStep } = await import("./base-currency-step")
const { renderInShell, stubViewport, VIEWPORTS } =
  await import("./test-harness")

const CURRENCIES = [
  { asset_id: 1, ticker: "EUR", name: "Euro", asset_type: 1 },
  { asset_id: 2, ticker: "GBP", name: "British Pound Sterling", asset_type: 1 },
  { asset_id: 3, ticker: "EGP", name: "Egyptian Pound", asset_type: 1 },
  { asset_id: 4, ticker: "USD", name: "United States Dollar", asset_type: 1 },
]

async function mount(
  props: Partial<Parameters<typeof BaseCurrencyStep>[0]> = {}
) {
  const onConfirm = props.onConfirm ?? vi.fn()
  await renderInShell(
    <Suspense fallback={<p>loading</p>}>
      <BaseCurrencyStep
        onConfirm={onConfirm}
        isSubmitting={props.isSubmitting ?? false}
      />
    </Suspense>
  )
  await screen.findByRole("listbox", { name: /search currencies/i })
  return { onConfirm }
}

beforeEach(() => {
  stubViewport(VIEWPORTS.full)
  searchAssets.mockResolvedValue({ data: { results: CURRENCIES } })
})

describe("BaseCurrencyStep", () => {
  it("lists every currency the API returned and counts them honestly", async () => {
    await mount()

    expect(screen.getAllByRole("option")).toHaveLength(4)
    expect(screen.getByText("4 currencies")).toBeInTheDocument()
  })

  it("filters on ticker and on name, and says how many of how many are left", async () => {
    const user = userEvent.setup()
    await mount()

    await user.type(screen.getByRole("combobox"), "pou")

    expect(
      screen.getAllByRole("option").map((option) => option.textContent)
    ).toEqual([
      expect.stringContaining("Egyptian Pound"),
      expect.stringContaining("British Pound Sterling"),
    ])
    expect(screen.getByText("2 of 4")).toBeInTheDocument()
  })

  it("refuses to guess when nothing matches", async () => {
    const user = userEvent.setup()
    await mount()

    await user.type(screen.getByRole("combobox"), "zzz")

    expect(screen.queryAllByRole("option")).toHaveLength(0)
    expect(
      screen.getByText("No currency matches that search.")
    ).toBeInTheDocument()
  })

  it("hands the chosen asset back on confirm", async () => {
    const user = userEvent.setup()
    const { onConfirm } = await mount()

    expect(
      screen.getByRole("button", { name: /Pick a currency/ })
    ).toBeDisabled()

    await user.click(screen.getByRole("option", { name: /GBP/ }))
    await user.click(screen.getByRole("button", { name: /Use GBP/ }))

    expect(onConfirm).toHaveBeenCalledWith({
      assetId: 2,
      ticker: "GBP",
      name: "British Pound Sterling",
      assetTypeId: 1,
    })
  })

  it("selects with the keyboard and confirms on a second Enter", async () => {
    const user = userEvent.setup()
    const { onConfirm } = await mount()

    await user.type(screen.getByRole("combobox"), "pou{ArrowDown}{Enter}")

    expect(screen.getByRole("option", { name: /GBP/ })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(onConfirm).not.toHaveBeenCalled()

    await user.keyboard("{Enter}")
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: "GBP" })
      )
    )
  })

  it("locks the whole step while the choice is being saved", async () => {
    await mount({ isSubmitting: true })

    expect(screen.getByRole("combobox")).toBeDisabled()
    expect(screen.getByRole("button", { name: /Saving/ })).toBeDisabled()
  })
})
