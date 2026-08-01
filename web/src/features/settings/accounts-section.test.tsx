import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getMe = vi.fn()
const getAccounts = vi.fn()
const getAccount = vi.fn()
const getAccountTypes = vi.fn()
const getAccountLiquidityTypes = vi.fn()
const addAccount = vi.fn()
const deleteAccount = vi.fn()
const listBindings = vi.fn()
const listConnections = vi.fn()

const ENDPOINTS: Record<string, unknown> = {
  getMe,
  getAccounts,
  getAccount,
  getAccountTypes,
  getAccountLiquidityTypes,
  addAccount,
  deleteAccount,
  listBindings,
  listConnections,
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

const TYPES = [
  { id: 1, name: "Current" },
  { id: 7, name: "Mortgage" },
]
const LIQUIDITY = [{ id: 1, name: "Liquid" }]

function accountsResponse() {
  return {
    data: {
      accounts: [
        {
          account_id: "a1",
          name: "Lloyds Current",
          account_type: 1,
          ownership_share: 1,
          liquidity_type: 1,
          suggested_currency: null,
        },
        {
          account_id: "a2",
          name: "Joint Bills",
          account_type: 1,
          ownership_share: 0.5,
          liquidity_type: 1,
          suggested_currency: null,
        },
      ],
      lookup_tables: {
        assets: [],
        account_types: TYPES,
        account_liquidity_types: LIQUIDITY,
      },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  stubViewport(VIEWPORTS.full)
  getMe.mockResolvedValue({
    data: { user_id: "00000000-0000-0000-0000-000000000000", role: "Admin" },
  })
  getAccounts.mockResolvedValue(accountsResponse())
  getAccountTypes.mockResolvedValue({ data: { account_types: TYPES } })
  getAccountLiquidityTypes.mockResolvedValue({
    data: { account_liquidity_types: LIQUIDITY },
  })
  getAccount.mockResolvedValue({
    data: {
      name: "Joint Bills",
      account_type: { id: 1, name: "Current" },
      ownership_share: 0.5,
      liquidity_type: { id: 1, name: "Liquid" },
      identifiers: [],
    },
  })
  addAccount.mockResolvedValue({ data: { account_id: "new-1" } })
  deleteAccount.mockResolvedValue({ data: undefined })
  listBindings.mockResolvedValue({ data: { bindings: [] } })
  listConnections.mockResolvedValue({ data: { connections: [] } })
})

async function renderAccountsSection() {
  await renderSettings(<SettingsScreen section="accounts" />)
  return screen.findByRole("heading", { level: 1, name: "Accounts" })
}

describe("the settings Accounts section", () => {
  it("is reachable from the settings rail", async () => {
    await renderAccountsSection()
    const rail = screen.getByRole("navigation", { name: "Settings sections" })
    expect(
      within(rail).getByRole("link", { name: "Accounts" })
    ).toBeInTheDocument()
  })

  it("keeps a joint account's share on its row", async () => {
    await renderAccountsSection()
    const row = (await screen.findByText("Joint Bills")).closest(
      "[data-slot='settings-list-row']"
    )
    expect(row).toHaveTextContent("your 50% share")
  })

  it("says a wholly owned account is entirely yours rather than showing 100%", async () => {
    await renderAccountsSection()
    const row = (await screen.findByText("Lloyds Current")).closest(
      "[data-slot='settings-list-row']"
    )
    expect(row).toHaveTextContent("entirely yours")
  })

  it("opens an empty editor from New account", async () => {
    const user = userEvent.setup()
    await renderAccountsSection()
    await screen.findByText("Lloyds Current")

    await user.click(screen.getByRole("button", { name: "New account" }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText("Name")).toHaveValue("")
  })

  it("opens the editor on the row you chose to edit", async () => {
    const user = userEvent.setup()
    await renderAccountsSection()
    const row = (await screen.findByText("Joint Bills")).closest(
      "[data-slot='settings-list-row']"
    ) as HTMLElement

    await user.click(within(row).getByRole("button", { name: "Edit" }))

    const dialog = await screen.findByRole("dialog")
    expect(await within(dialog).findByLabelText("Name")).toHaveValue(
      "Joint Bills"
    )
  })

  it("asks before deactivating and names the account it would deactivate", async () => {
    const user = userEvent.setup()
    await renderAccountsSection()
    const row = (await screen.findByText("Joint Bills")).closest(
      "[data-slot='settings-list-row']"
    ) as HTMLElement

    await user.click(within(row).getByRole("button", { name: "Deactivate" }))

    const confirm = await screen.findByRole("alertdialog")
    expect(confirm).toHaveTextContent("Deactivate Joint Bills?")
    expect(deleteAccount).not.toHaveBeenCalled()

    await user.click(
      within(confirm).getByRole("button", { name: "Deactivate" })
    )

    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledWith(
        "a2",
        "00000000-0000-0000-0000-000000000000"
      )
    })
  })

  it("keeps the account when the confirm is dismissed", async () => {
    const user = userEvent.setup()
    await renderAccountsSection()
    const row = (await screen.findByText("Joint Bills")).closest(
      "[data-slot='settings-list-row']"
    ) as HTMLElement

    await user.click(within(row).getByRole("button", { name: "Deactivate" }))
    const confirm = await screen.findByRole("alertdialog")
    await user.click(within(confirm).getByRole("button", { name: "Keep it" }))

    expect(deleteAccount).not.toHaveBeenCalled()
    expect(screen.getByText("Joint Bills")).toBeInTheDocument()
  })

  it("offers a first account when there are none", async () => {
    getAccounts.mockResolvedValue({
      data: {
        accounts: [],
        lookup_tables: {
          assets: [],
          account_types: TYPES,
          account_liquidity_types: LIQUIDITY,
        },
      },
    })

    await renderAccountsSection()

    expect(await screen.findByText("No accounts yet")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Add your first account" })
    ).toBeInTheDocument()
  })
})
