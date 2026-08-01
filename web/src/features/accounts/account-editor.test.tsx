import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getAccounts = vi.fn()
const getAccount = vi.fn()
const getAccountTypes = vi.fn()
const getAccountLiquidityTypes = vi.fn()
const addAccount = vi.fn()
const updateAccount = vi.fn()
const deleteAccount = vi.fn()

const ENDPOINTS: Record<string, unknown> = {
  getAccounts,
  getAccount,
  getAccountTypes,
  getAccountLiquidityTypes,
  addAccount,
  updateAccount,
  deleteAccount,
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

const { AccountEditor } = await import("./account-editor")
const { renderAccounts, stubViewport, TEST_USER_ID } =
  await import("./test-harness")

const TYPES = {
  account_types: [
    { id: 1, name: "Current" },
    { id: 3, name: "Investment" },
  ],
}

const LIQUIDITY = { account_liquidity_types: [{ id: 1, name: "Liquid" }] }

const ACCOUNT = {
  name: "Joint Bills",
  account_type: { id: 1, name: "Current" },
  ownership_share: 0.5,
  liquidity_type: { id: 1, name: "Liquid" },
  identifiers: [{ kind: "card_last4", value: "4291" }],
}

function validationRejection(errors: { field: string; message: string }[]) {
  return Object.assign(new Error("rejected"), {
    isAxiosError: true,
    response: {
      status: 422,
      data: {
        error_type: "ValidationError",
        message: "One or more fields failed validation.",
        errors,
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubViewport(1440)
  getAccountTypes.mockResolvedValue({ data: TYPES })
  getAccountLiquidityTypes.mockResolvedValue({ data: LIQUIDITY })
  getAccount.mockResolvedValue({ data: ACCOUNT })
  getAccounts.mockResolvedValue({
    data: {
      accounts: [],
      lookup_tables: {
        assets: [],
        account_types: TYPES.account_types,
        account_liquidity_types: LIQUIDITY.account_liquidity_types,
      },
    },
  })
  addAccount.mockResolvedValue({ data: { account_id: "new-1" } })
  updateAccount.mockResolvedValue({ data: {} })
  deleteAccount.mockResolvedValue({ data: undefined })
})

afterEach(() => {
  vi.clearAllMocks()
})

async function renderCreate() {
  await renderAccounts(
    <AccountEditor
      userId={TEST_USER_ID}
      mode={{ kind: "create" }}
      open
      onOpenChange={() => {}}
    />
  )
  return screen.findByRole("dialog")
}

async function renderEdit(onDeleted?: (accountId: string) => void) {
  await renderAccounts(
    <AccountEditor
      userId={TEST_USER_ID}
      mode={{ kind: "edit", accountId: "a1" }}
      open
      onOpenChange={() => {}}
      {...(onDeleted === undefined ? {} : { onDeleted })}
    />
  )
  return screen.findByRole("dialog")
}

describe("creating an account", () => {
  it("opens on the first type and a whole share so the common case is one field", async () => {
    const dialog = await renderCreate()
    await waitFor(() => {
      expect(within(dialog).getByLabelText("Account type")).toHaveValue(
        "Current"
      )
    })
    expect(within(dialog).getByLabelText("Your share")).toHaveValue("100")
    expect(dialog).toHaveTextContent("The whole account is yours.")
  })

  it("refuses to send a nameless account and says so on the field", async () => {
    const user = userEvent.setup()
    const dialog = await renderCreate()
    await waitFor(() => {
      expect(within(dialog).getByLabelText("Account type")).toHaveValue(
        "Current"
      )
    })

    await user.click(
      within(dialog).getByRole("button", { name: "Add account" })
    )

    expect(
      await within(dialog).findByText("Give the account a name.")
    ).toBeInTheDocument()
    expect(addAccount).not.toHaveBeenCalled()
  })

  it("sends the typed percentage as the fraction the server stores", async () => {
    const user = userEvent.setup()
    const dialog = await renderCreate()
    await waitFor(() => {
      expect(within(dialog).getByLabelText("Account type")).toHaveValue(
        "Current"
      )
    })

    await user.type(within(dialog).getByLabelText("Name"), "Nationwide Saver")
    await user.clear(within(dialog).getByLabelText("Your share"))
    await user.type(within(dialog).getByLabelText("Your share"), "33.3")
    await user.click(
      within(dialog).getByRole("button", { name: "Add account" })
    )

    await waitFor(() => {
      expect(addAccount).toHaveBeenCalledWith(TEST_USER_ID, {
        name: "Nationwide Saver",
        account_type: 1,
        liquidity_type: 1,
        ownership_share: 0.333,
        identifiers: [],
      })
    })
  })

  it("spells out what a part share means before it is saved", async () => {
    const user = userEvent.setup()
    const dialog = await renderCreate()
    await waitFor(() => {
      expect(within(dialog).getByLabelText("Your share")).toHaveValue("100")
    })

    await user.click(within(dialog).getByRole("button", { name: "Half" }))

    expect(dialog).toHaveTextContent(
      /Sverto counts 50% of every balance in this account/
    )
  })

  it("offers Undo on the toast and deactivates the account it just made", async () => {
    const user = userEvent.setup()
    const dialog = await renderCreate()
    await waitFor(() => {
      expect(within(dialog).getByLabelText("Account type")).toHaveValue(
        "Current"
      )
    })

    await user.type(within(dialog).getByLabelText("Name"), "Undo Me")
    await user.click(
      within(dialog).getByRole("button", { name: "Add account" })
    )

    const undo = await screen.findByRole("button", { name: "Undo" })
    await user.click(undo)

    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledWith("new-1", TEST_USER_ID)
    })
  })
})

describe("editing an account", () => {
  it("loads the saved values, including identifiers the list never carries", async () => {
    const dialog = await renderEdit()

    expect(await within(dialog).findByLabelText("Name")).toHaveValue(
      "Joint Bills"
    )
    expect(within(dialog).getByLabelText("Your share")).toHaveValue("50")
    expect(within(dialog).getByLabelText("Card ending value")).toHaveValue(
      "4291"
    )
  })

  it("saves a rename against the account it opened", async () => {
    const user = userEvent.setup()
    const dialog = await renderEdit()
    const name = await within(dialog).findByLabelText("Name")

    await user.clear(name)
    await user.type(name, "Household Bills")
    await user.click(
      within(dialog).getByRole("button", { name: "Save changes" })
    )

    await waitFor(() => {
      expect(updateAccount).toHaveBeenCalledWith("a1", TEST_USER_ID, {
        name: "Household Bills",
        account_type: 1,
        liquidity_type: 1,
        ownership_share: 0.5,
        identifiers: [{ kind: "card_last4", value: "4291" }],
      })
    })
  })

  it("puts an Undo on the toast that writes the previous values back", async () => {
    const user = userEvent.setup()
    const dialog = await renderEdit()
    const name = await within(dialog).findByLabelText("Name")

    await user.clear(name)
    await user.type(name, "Renamed")
    await user.click(
      within(dialog).getByRole("button", { name: "Save changes" })
    )

    await user.click(await screen.findByRole("button", { name: "Undo" }))

    await waitFor(() => {
      expect(updateAccount).toHaveBeenLastCalledWith("a1", TEST_USER_ID, {
        name: "Joint Bills",
        account_type: 1,
        liquidity_type: 1,
        ownership_share: 0.5,
        identifiers: [{ kind: "card_last4", value: "4291" }],
      })
    })
  })

  it("attaches an indexed server error to the identifier row it names", async () => {
    updateAccount.mockRejectedValueOnce(
      validationRejection([
        {
          field: "identifiers[0].value",
          message: "Card last 4 must be exactly 4 digits.",
        },
      ])
    )

    const user = userEvent.setup()
    const dialog = await renderEdit()
    const name = await within(dialog).findByLabelText("Name")

    await user.clear(name)
    await user.type(name, "Rejected")
    await user.click(
      within(dialog).getByRole("button", { name: "Save changes" })
    )

    const row = (
      await within(dialog).findByLabelText("Card ending value")
    ).closest("li")
    expect(row).not.toBeNull()
    expect(row).toHaveTextContent("Card last 4 must be exactly 4 digits.")
  })

  it("shows the flattened name rejection on the name field", async () => {
    updateAccount.mockRejectedValueOnce(
      validationRejection([
        {
          field: "body",
          message:
            "Failed to deserialize the JSON body into the target type: Must be between 1 and 200 characters. at line 1 column 69",
        },
      ])
    )

    const user = userEvent.setup()
    const dialog = await renderEdit()
    const name = await within(dialog).findByLabelText("Name")

    await user.clear(name)
    await user.type(name, "Rejected")
    await user.click(
      within(dialog).getByRole("button", { name: "Save changes" })
    )

    expect(
      await within(dialog).findByText("Must be between 1 and 200 characters.")
    ).toBeInTheDocument()
  })
})

describe("deactivating from the editor", () => {
  it("states what is lost and what survives before it will act", async () => {
    const user = userEvent.setup()
    const dialog = await renderEdit()
    await within(dialog).findByLabelText("Name")

    await user.click(
      within(dialog).getByRole("button", { name: "Deactivate account" })
    )

    const confirm = await screen.findByRole("alertdialog")
    expect(confirm).toHaveTextContent(/disappears from the accounts list/)
    expect(confirm).toHaveTextContent(/transactions stay in the ledger/)
    expect(deleteAccount).not.toHaveBeenCalled()
  })

  it("deactivates and reports the account back once confirmed", async () => {
    const onDeleted = vi.fn()
    const user = userEvent.setup()
    const dialog = await renderEdit(onDeleted)
    await within(dialog).findByLabelText("Name")

    await user.click(
      within(dialog).getByRole("button", { name: "Deactivate account" })
    )
    const confirm = await screen.findByRole("alertdialog")
    await user.click(
      within(confirm).getByRole("button", { name: "Deactivate" })
    )

    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledWith("a1", TEST_USER_ID)
    })
    expect(onDeleted).toHaveBeenCalledWith("a1")
  })
})

describe("when the reference lists cannot be loaded", () => {
  it("says the form cannot save and offers a retry rather than a broken picker", async () => {
    getAccountTypes.mockRejectedValue(new Error("offline"))

    await renderCreate()

    expect(
      await screen.findByText("Account types could not be loaded")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Add account" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Try again" })
    ).toBeInTheDocument()
  })
})
