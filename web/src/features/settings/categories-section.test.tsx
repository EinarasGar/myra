import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getMe = vi.fn()
const searchCategories = vi.fn()
const getCategories = vi.fn()
const getUserCategoryTypes = vi.fn()
const getUserAssets = vi.fn()
const getAssetTypes = vi.fn()
const postUserCategory = vi.fn()
const deleteUserCategory = vi.fn()
const postCustomAsset = vi.fn()
const apiGet = vi.fn()

const ENDPOINTS: Record<string, unknown> = {
  getMe,
  searchCategories,
  getCategories,
  getUserCategoryTypes,
  getUserAssets,
  getAssetTypes,
  postUserCategory,
  deleteUserCategory,
  postCustomAsset,
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
  apiClient: { get: apiGet },
}))

const { SettingsScreen } = await import("./settings-screen")
const { renderSettings, stubViewport, VIEWPORTS } =
  await import("./test-harness")
const { CATEGORY_COUNT_SCOPE, CUSTOM_ASSET_UNPRICED } = await import("./copy")

function globalCategory(id: number, name: string, typeId: number) {
  return {
    id,
    category: name,
    icon: "circle",
    category_type: typeId,
    is_global: true,
    is_system: false,
  }
}

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
  searchCategories.mockResolvedValue({
    data: {
      results: [
        globalCategory(1, "Groceries", 5),
        globalCategory(2, "Cafes & coffee", 5),
        globalCategory(3, "ETFs", 6),
      ],
      total_results: 3,
    },
  })
  getCategories.mockResolvedValue({
    data: {
      categories: [
        {
          id: 90,
          category: "Dog things",
          icon: "dog",
          category_type: 5,
          is_global: false,
          is_system: false,
        },
      ],
    },
  })
  getUserCategoryTypes.mockResolvedValue({
    data: {
      category_types: [
        { id: 5, name: "Everyday", is_global: true },
        { id: 6, name: "Investments", is_global: true },
        { id: 7, name: "Sabbatical 2027", is_global: false },
      ],
    },
  })
  getUserAssets.mockResolvedValue({
    data: {
      results: [
        { asset_id: 50, ticker: "FLAT", name: "Flat", asset_type: 9 },
        { asset_id: 51, ticker: "WATCH", name: "Watch", asset_type: 9 },
      ],
    },
  })
  getAssetTypes.mockResolvedValue({
    data: {
      asset_types: [
        { id: 1, name: "Currencies" },
        { id: 9, name: "Real estate" },
      ],
    },
  })
  postUserCategory.mockResolvedValue({
    data: {
      id: 99,
      category: "Flights",
      icon: "plane",
      category_type: { id: 7, name: "Sabbatical 2027" },
      is_global: false,
      is_system: false,
    },
  })
  deleteUserCategory.mockResolvedValue({ data: undefined })
  postCustomAsset.mockResolvedValue({
    data: { asset_id: 52, ticker: "BOAT", name: "Sailing boat", asset_type: 9 },
  })
  apiGet.mockImplementation((path: string) =>
    Promise.resolve({
      data: path.includes("/50/")
        ? { latest_rate: 164_000, last_updated: 1_780_000_000 }
        : {},
    })
  )
})

afterEach(cleanup)

describe("the category catalogue", () => {
  it("merges the global route with the user route, so custom categories are visible", async () => {
    await renderSettings(<SettingsScreen section="categories" />)
    expect(await screen.findByText("Groceries")).toBeInTheDocument()
    expect(screen.getByText("Dog things")).toBeInTheDocument()
    expect(searchCategories).toHaveBeenCalled()
    expect(getCategories).toHaveBeenCalled()
  })

  it("keeps an empty type on the page rather than dropping it", async () => {
    await renderSettings(<SettingsScreen section="categories" />)
    expect(await screen.findByText("Sabbatical 2027")).toBeInTheDocument()
    expect(screen.getByText("0 categories")).toBeInTheDocument()
  })

  it("says the counts are memberships, not usage", async () => {
    await renderSettings(<SettingsScreen section="categories" />)
    await screen.findByText("Groceries")
    expect(
      screen.getByText(new RegExp(CATEGORY_COUNT_SCOPE.slice(0, 40)))
    ).toBeVisible()
    expect(screen.queryByText(/used by \d+ transactions/)).toBeNull()
  })

  it("marks a type you own and leaves a seeded one uneditable", async () => {
    await renderSettings(<SettingsScreen section="categories" />)
    await screen.findByText("Sabbatical 2027")
    expect(screen.getAllByText("Yours")).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "Rename" })).toHaveLength(1)
    expect(
      screen.queryByRole("button", { name: "Delete Groceries" })
    ).toBeNull()
    expect(
      screen.getByRole("button", { name: "Delete Dog things" })
    ).toBeInTheDocument()
  })

  it("creates a category into the type its Add button belongs to", async () => {
    await renderSettings(<SettingsScreen section="categories" />)
    await screen.findByText("Sabbatical 2027")

    const addButtons = screen.getAllByRole("button", { name: "Add" })
    fireEvent.click(addButtons[addButtons.length - 1] as HTMLElement)

    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: "Flights" },
    })
    fireEvent.click(within(dialog).getByLabelText("Icon"))
    const icons = await screen.findByRole("listbox")
    fireEvent.click(within(icons).getByRole("option", { name: "plane" }))
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Add category" })
    )

    await waitFor(() => {
      expect(postUserCategory).toHaveBeenCalledWith(
        "00000000-0000-0000-0000-000000000000",
        { category: "Flights", icon: "plane", category_type_id: 7 }
      )
    })
  })

  it("states what survives a delete before deleting anything", async () => {
    await renderSettings(<SettingsScreen section="categories" />)
    await screen.findByText("Dog things")
    fireEvent.click(screen.getByRole("button", { name: "Delete Dog things" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText(/transactions are not touched/)
    ).toBeVisible()
    expect(deleteUserCategory).not.toHaveBeenCalled()

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete category" })
    )
    await waitFor(() => {
      expect(deleteUserCategory).toHaveBeenCalledWith(
        "00000000-0000-0000-0000-000000000000",
        90
      )
    })
  })
})

describe("custom assets", () => {
  it("prices what it can and refuses to price what it cannot", async () => {
    await renderSettings(<SettingsScreen section="categories" />)
    expect(await screen.findByText("FLAT")).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText("£164,000.00")).toBeInTheDocument()
    })
    expect(
      screen.getAllByLabelText(new RegExp(CUSTOM_ASSET_UNPRICED.slice(0, 30)))
        .length
    ).toBeGreaterThan(0)
  })

  it("creates a custom asset against the base currency", async () => {
    await renderSettings(<SettingsScreen section="categories" />)
    fireEvent.click(await screen.findByRole("button", { name: "New asset" }))

    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Ticker"), {
      target: { value: "BOAT" },
    })
    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: "Sailing boat" },
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create asset" })
    )

    await waitFor(() => {
      expect(postCustomAsset).toHaveBeenCalledWith(
        "00000000-0000-0000-0000-000000000000",
        {
          ticker: "BOAT",
          name: "Sailing boat",
          asset_type: 9,
          base_asset_id: 1,
        }
      )
    })
  })
})
