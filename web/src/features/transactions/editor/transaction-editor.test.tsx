import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AssetRef } from "@/lib/domain/refs"
import { normalizeHttpError } from "@/lib/errors"

const useTransactionDetail = vi.fn()
const createMutate = vi.fn()
const updateMutate = vi.fn()
const createState = { error: null as unknown, isPending: false }
const updateState = { error: null as unknown, isPending: false }

const CURRENCIES: AssetRef[] = [
  { assetId: 1, ticker: "GBP", name: "Pound sterling", assetTypeId: 1 },
  { assetId: 2, ticker: "USD", name: "US dollar", assetTypeId: 1 },
]

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  useTransactionDetail: (input: unknown) =>
    useTransactionDetail(input) as unknown,
}))

vi.mock("./api/mutations", () => ({
  useCreateTransaction: () => ({
    mutate: createMutate as unknown,
    get error() {
      return createState.error
    },
    get isPending() {
      return createState.isPending
    },
  }),
  useUpdateTransaction: () => ({
    mutate: updateMutate as unknown,
    get error() {
      return updateState.error
    },
    get isPending() {
      return updateState.isPending
    },
  }),
}))

vi.mock("@/features/accounts/api", () => ({
  useAccountsSuspense: () => ({
    groups: [
      {
        label: "Cash",
        accounts: [
          {
            accountId: "0d1a6f4a-3b2c-4c5d-8e9f-0a1b2c3d4e5f",
            name: "Lloyds Current",
            accountTypeName: "Current",
          },
          {
            accountId: "1e2b7a5b-4c3d-4d6e-9f0a-1b2c3d4e5f60",
            name: "Trading 212 ISA",
            accountTypeName: "Investment",
          },
        ],
      },
    ],
    byId: {
      "0d1a6f4a-3b2c-4c5d-8e9f-0a1b2c3d4e5f": {
        name: "Lloyds Current",
        suggestedCurrencyAssetId: 1,
      },
      "1e2b7a5b-4c3d-4d6e-9f0a-1b2c3d4e5f60": {
        name: "Trading 212 ISA",
        suggestedCurrencyAssetId: 2,
      },
    },
  }),
}))

vi.mock("@/features/categories/api", () => ({
  useCategoryCatalogue: () => ({
    groups: [
      {
        type: { name: "Spending" },
        categories: [{ id: 7, name: "Groceries" }],
      },
    ],
    byId: new Map([[7, { id: 7, name: "Groceries" }]]),
  }),
}))

vi.mock("@/features/onboarding/currency-assets", () => ({
  useCurrencyAssets: () => CURRENCIES,
}))

const { TransactionEditor } = await import("./test-harness")
const { assetPurchase, regular } = await import("../api/fixtures")
const { lookupTables } = await import("../api/fixtures")
const { toLookupIndex } = await import("../api")
const { renderTransactions, stubViewport, TEST_USER_ID } =
  await import("../review/test-harness")
const { SHAPE_REJECTED } = await import("./validation")
const { MOCK_EDITOR_PROPOSAL } = await import("@/lib/mock")

const ACCOUNT = "0d1a6f4a-3b2c-4c5d-8e9f-0a1b2c3d4e5f"
const NOW = new Date("2026-07-26T14:00:00Z")

const SAVED_ENTRY_ID = 501

function detail(overrides: Record<string, unknown> = {}) {
  return {
    detail: {
      lookup: toLookupIndex(lookupTables),
      raw: {
        transaction: regular({
          entry: {
            account_id: ACCOUNT,
            asset_id: 1,
            amount: -42.18,
            entry_id: SAVED_ENTRY_ID,
          },
        }),
        lookup_tables: lookupTables,
      },
    },
    isPending: false,
    isError: false,
    error: null,
    isFetching: false,
    refetch: () => {},
    ...overrides,
  }
}

async function renderEditor(
  props: Partial<Parameters<typeof TransactionEditor>[0]> = {}
) {
  return renderTransactions(
    <TransactionEditor
      userId={TEST_USER_ID}
      mode={{ kind: "create" }}
      open
      onOpenChange={() => {}}
      now={NOW}
      {...props}
    />
  )
}

async function pick(
  user: ReturnType<typeof userEvent.setup>,
  field: string,
  option: string | RegExp
) {
  await user.click(screen.getByLabelText(field))
  await user.click(await screen.findByRole("option", { name: option }))
}

async function fillPurchase(user: ReturnType<typeof userEvent.setup>) {
  await pick(user, "Account", /Lloyds Current/)
  await pick(user, "Category", "Groceries")
  await pick(user, "Amount currency", /GBP/)
  await user.type(screen.getByLabelText("Amount"), "42.18")
}

beforeEach(() => {
  stubViewport(1440)
  createState.error = null
  createState.isPending = false
  updateState.error = null
  updateState.isPending = false
  createMutate.mockReset()
  updateMutate.mockReset()
  useTransactionDetail.mockReturnValue(detail())
})

describe("the type chooser", () => {
  it("offers all thirteen types, not the design's twelve", async () => {
    await renderEditor()
    const chooser = screen.getByTestId("harness").ownerDocument.body
    const cards = within(chooser).getAllByRole("option", { selected: false })
    expect(
      cards.filter((card) => card.textContent !== "").length
    ).toBeGreaterThanOrEqual(13)
    expect(screen.getByText("Move cash")).toBeInTheDocument()
  })

  it("narrows to what was typed", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.type(
      screen.getByLabelText("Filter transaction types"),
      "dividend"
    )

    expect(screen.getByText("Cash dividend")).toBeInTheDocument()
    expect(screen.queryByText("Move cash")).not.toBeInTheDocument()
  })

  it("says nothing matches rather than showing an empty grid", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.type(screen.getByLabelText("Filter transaction types"), "zzz")
    expect(screen.getByText("No type matches that.")).toBeInTheDocument()
  })

  it("opens the form for the type that was picked", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))

    expect(await screen.findByLabelText("Amount")).toBeInTheDocument()
    expect(screen.getByLabelText("Category")).toBeInTheDocument()
  })
})

describe("switching type", () => {
  it("keeps what was already typed", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))
    await user.type(await screen.findByLabelText("Amount"), "42.18")

    await user.click(screen.getByRole("button", { name: /Change type/ }))
    await user.click(screen.getByText("Cash out"))

    expect(await screen.findByLabelText("Amount out")).toHaveValue("42.18")
  })

  it("is reachable with the keyboard the design promises", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))
    await screen.findByLabelText("Amount")

    await user.keyboard("{Meta>}t{/Meta}")
    expect(
      await screen.findByLabelText("Filter transaction types")
    ).toBeInTheDocument()
  })
})

describe("each type shows only its own fields", () => {
  it("gives Buy asset one account and no category or description", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Buy"))

    expect(await screen.findByLabelText("Account")).toBeInTheDocument()
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument()
    expect(screen.getAllByLabelText(/Account/)).toHaveLength(1)
  })

  it("gives a purchase a category and a description", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))

    expect(await screen.findByLabelText("Category")).toBeInTheDocument()
    expect(screen.getByLabelText("Description")).toBeInTheDocument()
  })

  it("gives a cash balance transfer two accounts but one amount", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Move cash"))

    expect(await screen.findByLabelText("Account debited")).toBeInTheDocument()
    expect(screen.getByLabelText("Account credited")).toBeInTheDocument()
    expect(screen.getByLabelText("Amount moved")).toBeInTheDocument()
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("To")).not.toBeInTheDocument()
  })
})

describe("direction as a layout", () => {
  it("stacks an outgoing panel then an incoming one", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Buy"))

    const panels = await screen.findAllByTestId("harness")
    expect(panels).toHaveLength(1)
    const directions = document.querySelectorAll(
      "[data-slot='direction-panel']"
    )
    expect(
      [...directions].map((panel) => panel.getAttribute("data-direction"))
    ).toEqual(["outgoing", "incoming"])
  })

  it("computes the implied unit price live", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Buy"))

    await user.type(await screen.findByLabelText("Cash paid"), "672.80")
    await user.type(screen.getByLabelText("Units bought"), "8")

    const strip = document.querySelector("[data-slot='implied-rate']")
    expect(strip?.textContent).toContain("84.1")
  })
})

describe("validation", () => {
  it("refuses to send an incomplete transaction and says which field", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))
    await user.click(
      await screen.findByRole("button", { name: /^Save transaction/ })
    )

    expect(createMutate).not.toHaveBeenCalled()
    expect(screen.getAllByText("Pick an account.").length).toBeGreaterThan(0)
    expect(screen.getByText("Pick a category.")).toBeInTheDocument()
  })

  it("sends exactly one request with the signs the type requires", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))
    await screen.findByLabelText("Amount")
    await fillPurchase(user)
    await user.click(screen.getByRole("button", { name: /^Save transaction/ }))

    expect(createMutate).toHaveBeenCalledTimes(1)
    const [variables] = createMutate.mock.calls[0] as [
      { transaction: Record<string, unknown> },
    ]
    expect(variables.transaction).toMatchObject({
      type: "regular",
      category_id: 7,
      entry: { account_id: ACCOUNT, asset_id: 1, amount: -42.18 },
    })
  })

  it("keeps the sheet open on Save and add another, cleared for the next one", async () => {
    const user = userEvent.setup()
    createMutate.mockImplementation(
      (
        _variables: unknown,
        options: { onSuccess: (response: unknown) => void }
      ) => {
        options.onSuccess({ transaction: { transaction_id: "tx-new" } })
      }
    )
    const onOpenChange = vi.fn()
    await renderEditor({ onOpenChange })
    await user.click(screen.getByText("Purchase"))
    await screen.findByLabelText("Amount")
    await fillPurchase(user)
    await user.click(
      screen.getByRole("button", { name: "Save and add another" })
    )

    expect(createMutate).toHaveBeenCalledTimes(1)
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Amount")).toHaveValue("")
    expect(screen.getByLabelText("Account")).toHaveValue("Lloyds Current")
  })

  it("saves on the keystroke the footer advertises", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))
    await screen.findByLabelText("Amount")
    await fillPurchase(user)
    await user.keyboard("{Meta>}{Enter}{/Meta}")

    expect(createMutate).toHaveBeenCalledTimes(1)
  })
})

describe("server errors", () => {
  it("attaches a field error the server did name to its own input", async () => {
    const user = userEvent.setup()
    createState.error = normalizeHttpError({
      status: 422,
      data: {
        error_type: "ValidationError",
        message: "One or more fields failed validation.",
        errors: [
          { field: "entry.amount", message: "Must be a positive value." },
        ],
      },
    })
    await renderEditor()
    await user.click(screen.getByText("Purchase"))

    expect(
      await screen.findByText("Must be a positive value.")
    ).toBeInTheDocument()
  })

  it("banners the one error the server cannot attach to a field", async () => {
    const user = userEvent.setup()
    createState.error = normalizeHttpError({
      status: 422,
      data: {
        error_type: "ValidationError",
        message: "One or more fields failed validation.",
        errors: [
          {
            field: "transaction",
            message:
              "data did not match any variant of untagged enum TransactionWithEntries",
          },
        ],
      },
    })
    await renderEditor()
    await user.click(screen.getByText("Purchase"))

    expect(await screen.findByRole("alert")).toHaveTextContent(SHAPE_REJECTED)
  })
})

describe("editing an existing transaction", () => {
  it("draws a skeleton, never an empty form, while it loads", async () => {
    useTransactionDetail.mockReturnValue(
      detail({ detail: undefined, isPending: true })
    )
    await renderEditor({ mode: { kind: "edit", transactionId: "tx-regular" } })

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading this transaction"
    )
    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument()
  })

  it("offers a retry when the transaction cannot be loaded", async () => {
    useTransactionDetail.mockReturnValue(
      detail({ detail: undefined, isError: true, error: new Error("nope") })
    )
    await renderEditor({ mode: { kind: "edit", transactionId: "tx-regular" } })

    expect(
      await screen.findByRole("button", { name: "Try again" })
    ).toBeInTheDocument()
  })

  it("seeds every field from what was saved", async () => {
    await renderEditor({ mode: { kind: "edit", transactionId: "tx-regular" } })

    expect(await screen.findByLabelText("Amount")).toHaveValue("42.18")
    expect(screen.getByLabelText("Description")).toHaveValue("Tesco")
  })

  it("shows the asset it was saved with, not an empty picker", async () => {
    useTransactionDetail.mockReturnValue(
      detail({
        detail: {
          lookup: toLookupIndex(lookupTables),
          raw: {
            transaction: assetPurchase(),
            lookup_tables: lookupTables,
          },
        },
      })
    )
    await renderEditor({ mode: { kind: "edit", transactionId: "tx-purchase" } })

    expect(await screen.findByLabelText("Units bought asset")).toHaveValue(
      "VUSA.LSE"
    )
    expect(screen.getByLabelText("Cash paid currency")).toHaveValue("GBP")
  })

  it("sends the entry ids back so the entries are updated, not replaced", async () => {
    const user = userEvent.setup()
    await renderEditor({ mode: { kind: "edit", transactionId: "tx-regular" } })
    await screen.findByLabelText("Amount")
    await pick(user, "Amount currency", /USD/)
    await user.click(screen.getByRole("button", { name: /Save changes/ }))

    expect(updateMutate).toHaveBeenCalledTimes(1)
    const [variables] = updateMutate.mock.calls[0] as [
      { transaction: { entry: { entry_id: number } } },
    ]
    expect(variables.transaction.entry.entry_id).toBe(SAVED_ENTRY_ID)
  })
})

describe("every picker is a real picker", () => {
  it("leaves no native select anywhere in the editor", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Buy"))
    await screen.findByLabelText("Account")

    expect(document.querySelectorAll("select")).toHaveLength(0)
    expect(
      document.querySelectorAll("[data-slot=entity-picker-input]").length
    ).toBeGreaterThanOrEqual(3)
  })

  it("searches a currency instead of scrolling a hundred options", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))
    await user.click(await screen.findByLabelText("Amount currency"))
    await user.keyboard("dollar")

    expect(
      await screen.findByRole("option", { name: /USD/ })
    ).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /GBP/ })).toBeNull()
  })

  it("fills the currency of the account that was just chosen", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))
    await screen.findByLabelText("Amount")

    expect(screen.getByLabelText("Amount currency")).toHaveValue("")
    await pick(user, "Account", /Trading 212 ISA/)

    expect(screen.getByLabelText("Amount currency")).toHaveValue("USD")
  })

  it("does not overwrite a currency the user already chose", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))
    await screen.findByLabelText("Amount")

    await pick(user, "Amount currency", /GBP/)
    await pick(user, "Account", /Trading 212 ISA/)

    expect(screen.getByLabelText("Amount currency")).toHaveValue("GBP")
  })
})

describe("closing", () => {
  it("asks before discarding work rather than closing under the user", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    await renderEditor({ onOpenChange })
    await user.click(screen.getByText("Purchase"))
    await user.click(screen.getByRole("button", { name: "Close" }))

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByText(/Discard this transaction/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Discard" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes straight away when nothing has been typed", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    await renderEditor({ onOpenChange })
    await user.click(screen.getByRole("button", { name: "Close" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe("a Myra proposal", () => {
  it("marks what Myra filled and what has since been corrected", async () => {
    const user = userEvent.setup()
    await renderEditor({ mode: { kind: "proposal" } })

    expect(await screen.findByLabelText("Description")).toHaveValue(
      MOCK_EDITOR_PROPOSAL.description
    )
    expect(
      document.querySelectorAll("[data-slot='provenance-dot']").length
    ).toBeGreaterThan(0)
    expect(document.querySelector("[data-slot='provenance-edited']")).toBeNull()

    await user.clear(screen.getByLabelText("Description"))
    await user.type(screen.getByLabelText("Description"), "Sainsbury's")

    expect(
      document.querySelector("[data-slot='provenance-edited']")
    ).not.toBeNull()
    expect(screen.getByText("was Tesco")).toBeInTheDocument()
  })

  it("carries the correction chat inside the form, marked as invented", async () => {
    await renderEditor({ mode: { kind: "proposal" } })

    const chat = await screen.findByText("Tell Myra what to change")
    const panel = chat.closest("[data-slot='correction-chat']")
    expect(panel).toHaveAttribute("data-mock", "editors.myra-proposal")
    expect(
      within(panel as HTMLElement).getByText(/Corrections go back to Myra/)
    ).toBeInTheDocument()
  })
})

describe("at every width", () => {
  it.each([
    [1440, "full"],
    [1100, "tight"],
    [900, "stacked"],
    [390, "phone"],
  ])("renders the form at %i", async (viewport) => {
    stubViewport(viewport)
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))

    expect(await screen.findByLabelText("Amount")).toBeInTheDocument()
    expect(document.querySelector("[data-slot='editor-rail']")).toBeNull()
    expect(
      screen.getByRole("button", { name: /^Save transaction/ })
    ).toBeInTheDocument()
  })

  it("keeps the sheet to a single form column at every width", async () => {
    const user = userEvent.setup()
    for (const viewport of [1440, 1100]) {
      stubViewport(viewport)
      const mounted = await renderEditor()
      await user.click(screen.getByText("Purchase"))
      await screen.findByLabelText("Amount")
      expect(
        document.querySelector("[data-slot='editor-rail-column']")
      ).toBeNull()
      expect(document.querySelector("[data-slot='editor-rail']")).toBeNull()
      mounted.unmount()
    }
  })

  it("hides the keyboard hints below 1024 rather than lying about a keyboard", async () => {
    const user = userEvent.setup()
    stubViewport(390)
    await renderEditor()
    await user.click(screen.getByText("Purchase"))
    await screen.findByLabelText("Amount")

    expect(screen.queryByText("⌘⏎")).not.toBeInTheDocument()
    expect(screen.queryByText("⌘T")).not.toBeInTheDocument()
  })
})
