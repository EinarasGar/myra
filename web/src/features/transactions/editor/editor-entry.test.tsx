import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AssetRef } from "@/lib/domain/refs"

const useTransactionDetail = vi.fn()
const createMutate = vi.fn()
const updateMutate = vi.fn()

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
    error: null,
    isPending: false,
  }),
  useUpdateTransaction: () => ({
    mutate: updateMutate as unknown,
    error: null,
    isPending: false,
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
          },
        ],
      },
    ],
    byId: {
      "0d1a6f4a-3b2c-4c5d-8e9f-0a1b2c3d4e5f": { name: "Lloyds Current" },
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
const { assetPurchase, lookupTables, ASSET_VUSA } =
  await import("../api/fixtures")
const { toLookupIndex } = await import("../api")
const { renderTransactions, stubViewport, TEST_USER_ID } =
  await import("../review/test-harness")

const NOW = new Date("2026-07-26T14:00:00Z")

function purchaseDetail() {
  return {
    detail: {
      lookup: toLookupIndex(lookupTables),
      raw: {
        transaction: assetPurchase(),
        lookup_tables: lookupTables,
      },
    },
    isPending: false,
    isError: false,
    error: null,
    isFetching: false,
    refetch: () => {},
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

function shownValue(control: HTMLElement): string {
  if (control instanceof HTMLSelectElement) {
    return control.selectedOptions[0]?.textContent ?? ""
  }
  return (control as HTMLInputElement).value
}

beforeEach(() => {
  stubViewport(1440)
  createMutate.mockReset()
  updateMutate.mockReset()
  useTransactionDetail.mockReturnValue(purchaseDetail())
})

describe("editing a transaction that names an asset", () => {
  it("shows the asset it was saved with instead of an unset field", async () => {
    await renderEditor({
      mode: { kind: "edit", transactionId: "tx-purchase" },
    })

    const control = await screen.findByLabelText("Units bought asset")
    expect(shownValue(control)).toContain("VUSA")
    expect(shownValue(control)).not.toBe("")
    expect(String(ASSET_VUSA)).not.toBe("")
  })
})

describe("a money field", () => {
  it("refuses letters instead of storing them", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))

    const amount = await screen.findByLabelText("Amount")
    await user.click(amount)
    await user.keyboard("abc12def")

    expect(amount).toHaveValue("12")
  })

  it("reads a decimal comma as a decimal point, not a hundredfold", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))

    const amount = await screen.findByLabelText("Amount")
    await user.click(amount)
    await user.keyboard("12,50")
    await user.tab()

    expect(amount).toHaveValue("12.5")
  })

  it("says a number is unreadable rather than asking for one that is there", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))

    const amount = await screen.findByLabelText("Amount")
    await user.click(amount)
    await user.keyboard("1,2,3")
    await user.click(screen.getByRole("button", { name: /^Save transaction/ }))

    expect(await screen.findByText("That is not a number.")).toBeInTheDocument()
    expect(createMutate).not.toHaveBeenCalled()
  })
})

describe("the type chooser keyboard hint", () => {
  it("moves through the types with the arrows it advertises", async () => {
    const user = userEvent.setup()
    await renderEditor()

    const filter = screen.getByLabelText("Filter transaction types")
    expect(filter).toHaveFocus()

    await user.keyboard("{ArrowDown}")
    const options = screen.getAllByRole("option")
    expect(filter).toHaveAttribute("aria-activedescendant", options[1]?.id)
  })

  it("opens the type that Enter lands on", async () => {
    const user = userEvent.setup()
    await renderEditor()

    await user.type(
      screen.getByLabelText("Filter transaction types"),
      "dividend"
    )
    await user.keyboard("{Enter}")

    expect(
      await screen.findByRole("button", { name: /^Save transaction/ })
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Filter transaction types")).toBeNull()
    expect(screen.getAllByText("Cash dividend").length).toBeGreaterThan(0)
  })
})

describe("the sheet as a form", () => {
  it("puts the cursor in the first field of the type just chosen", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))

    expect(await screen.findByLabelText("Amount")).toHaveFocus()
  })

  it("saves on Enter from a field, the way every other form does", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))

    const amount = await screen.findByLabelText("Amount")
    await user.click(amount)
    await user.keyboard("42.18{Enter}")

    expect(createMutate).toHaveBeenCalledTimes(0)
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /still need|needs an answer/
    )
  })
})

describe("a rejected save", () => {
  it("summarises the count and puts the cursor on the first thing to fix", async () => {
    const user = userEvent.setup()
    await renderEditor()
    await user.click(screen.getByText("Purchase"))
    await screen.findByLabelText("Amount")
    await user.click(screen.getByRole("button", { name: /^Save transaction/ }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/fields still need an answer/)
    expect(alert).toHaveTextContent(/Nothing has been saved/)

    const invalid = document.querySelectorAll('[aria-invalid="true"]')
    expect(invalid.length).toBeGreaterThan(0)
    expect(invalid[0]).toHaveFocus()
  })
})
