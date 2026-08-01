import { screen } from "@testing-library/react"

import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  accountFees,
  cashDividend,
  ghostTransfer,
  individualItem,
  lookupTables,
  regular,
} from "@/features/transactions/api/fixtures"
import {
  isTransactionRow,
  toLedgerRows,
  toLookupIndex,
} from "@/features/transactions/api"
import type { LedgerTransactionRow } from "@/features/transactions/api"

const useLedger = vi.fn()

vi.mock("@/features/transactions/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/transactions/api")>()),
  useLedger: (input: unknown) => useLedger(input) as unknown,
}))

const { AccountRecentTransactions } = await import("./account-recent")
const { renderAccounts } = await import("./test-harness")

const ACCOUNT_ID = "11111111-1111-1111-1111-111111111111"

function rows(): LedgerTransactionRow[] {
  return toLedgerRows(
    [
      individualItem(regular()),
      individualItem(cashDividend()),
      individualItem(ghostTransfer()),
      individualItem(accountFees()),
    ],
    toLookupIndex(lookupTables)
  ).filter(isTransactionRow)
}

function ledger(overrides: Record<string, unknown> = {}) {
  return {
    rows: rows(),
    totalResults: 34,
    isPending: false,
    isError: false,
    error: null,
    refetch: () => {},
    ...overrides,
  }
}

async function renderRecent() {
  return renderAccounts(
    <AccountRecentTransactions
      accountId={ACCOUNT_ID}
      accountName="Barclays Current"
    />
  )
}

function footerLink(): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>(
    '[data-slot="panel-footer"] a'
  )
}

beforeEach(() => {
  useLedger.mockReturnValue(ledger())
})

describe("AccountRecentTransactions", () => {
  it("asks the ledger only for this account", async () => {
    await renderRecent()
    expect(useLedger).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: [
          {
            key: "account",
            accountId: ACCOUNT_ID,
            label: "Barclays Current",
          },
        ],
      })
    )
  })

  it("carries the account into the ledger the footer links to", async () => {
    await renderRecent()
    const link = footerLink()
    expect(link?.textContent).toContain("Barclays Current")
    expect(link?.getAttribute("href")).toContain(
      `account=${encodeURIComponent(ACCOUNT_ID)}`
    )
  })

  it("points the footer at the ledger route, not somewhere else", async () => {
    await renderRecent()
    const href = footerLink()?.getAttribute("href") ?? ""
    expect(href.split("?")[0]).toBe("/transactions")
  })

  it("names the handful it shows as well as the account's total", async () => {
    await renderRecent()
    const note = document.querySelector('[data-slot="panel-note"]')
    const listed = document.querySelectorAll("ul > li").length
    expect(note?.textContent).toContain("Newest")
    expect(note?.textContent).toContain(String(listed))
    expect(note?.textContent).toContain("34")
    expect(note?.textContent).toContain("in this account")
  })

  it("counts only the rows it drew, so a dropped group cannot inflate the header", async () => {
    const transactions = rows()
    useLedger.mockReturnValue(
      ledger({
        rows: [
          {
            ...transactions[0],
            rowId: "group-1",
            kind: "group",
          },
          ...transactions,
        ],
      })
    )
    await renderRecent()
    const note = document.querySelector('[data-slot="panel-note"]')
    const listed = document.querySelectorAll("ul > li").length
    expect(listed).toBe(4)
    expect(note?.textContent).toContain("Newest")
    expect(note?.textContent).toContain("4")
    expect(note?.textContent).not.toMatch(/Newest\s*5/)
  })

  it("offers no link out of an account with nothing recorded against it", async () => {
    useLedger.mockReturnValue(ledger({ rows: [], totalResults: 0 }))
    await renderRecent()
    expect(footerLink()).toBeNull()
    expect(
      screen.getByText(/Nothing has been recorded against this account yet/)
    ).toBeVisible()
  })

  it("offers a retry instead of an empty list when the feed fails", async () => {
    useLedger.mockReturnValue(
      ledger({ rows: [], isError: true, error: new Error("nope") })
    )
    await renderRecent()
    expect(screen.getByRole("alert")).toBeVisible()
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible()
    expect(footerLink()).toBeNull()
  })

  it("shows placeholder rows rather than an empty panel while loading", async () => {
    useLedger.mockReturnValue(
      ledger({ rows: [], totalResults: undefined, isPending: true })
    )
    await renderRecent()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(5)
    expect(document.querySelector('[data-slot="panel-note"]')).toBeNull()
  })
})
