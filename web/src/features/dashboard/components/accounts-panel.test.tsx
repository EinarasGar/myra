import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import type {
  AccountBalance,
  AccountBalancesView,
} from "@/features/accounts/api"
import type { AccountClass } from "@/lib/domain/accounts"
import {
  ACCOUNT_CLASS_LABELS,
  ACCOUNT_CLASS_ORDER,
} from "@/lib/domain/accounts"

import type { AccountSyncIndex } from "../api"
import { renderInRouter } from "../test-router"
import { AccountsPanelView } from "./accounts-panel"

function balance(
  accountId: string,
  name: string,
  accountClass: AccountClass,
  value: number,
  overrides: Partial<AccountBalance> = {}
): AccountBalance {
  return {
    accountId,
    name,
    accountTypeId: 1,
    accountTypeName: "Current",
    accountClass,
    isLiquid: accountClass === "cash",
    isLiability: accountClass === "liabilities",
    liquidityTypeId: 1,
    liquidityTypeName: "Liquid",
    ownershipShare: 1,
    ownershipSharePercent: 100,
    isJoint: false,
    suggestedCurrencyAssetId: null,
    suggestedCurrency: null,
    value,
    ratelessCount: 0,
    hasHoldings: true,
    ...overrides,
  }
}

const ACCOUNTS = [
  balance("cash-1", "Lloyds Current", "cash", 4183.06),
  balance("cash-2", "Marcus Savings", "cash", 12_400),
  balance("isa", "Trading 212 ISA", "investments", 14_234.4),
  balance("mortgage", "Halifax mortgage", "liabilities", -144_722.37),
]

function view(overrides: Partial<AccountBalancesView> = {}) {
  const groups = ACCOUNT_CLASS_ORDER.map((accountClass) => {
    const members = ACCOUNTS.filter(
      (account) => account.accountClass === accountClass
    )
    return {
      accountClass,
      label: ACCOUNT_CLASS_LABELS[accountClass],
      accounts: members,
      subtotal: members.reduce((sum, account) => sum + account.value, 0),
      ratelessCount: 0,
    }
  })

  return {
    accounts: ACCOUNTS,
    groups,
    total: 0,
    netWorth: 0,
    unmatchedValue: 0,
    unmatchedAccountIds: [],
    assetsTotal: 0,
    liabilitiesTotal: 0,
    liquidTotal: 16_583.06,
    ratelessCount: 0,
    isDegraded: false,
    ...overrides,
  } satisfies AccountBalancesView
}

async function renderPanel(
  overrides: Partial<AccountBalancesView> = {},
  sync: AccountSyncIndex = {}
) {
  return renderInRouter(
    <AccountsPanelView view={view(overrides)} currency="GBP" sync={sync} />
  )
}

function groupHeaders(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="account-group-header"]')
  )
}

function rowNames(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="account-row"]')
  ).map((row) => row.textContent ?? "")
}

describe("AccountsPanelView", () => {
  it("draws a group per populated class and skips the empty ones", async () => {
    await renderPanel()
    expect(groupHeaders().map((header) => header.textContent)).toEqual([
      expect.stringContaining("Cash"),
      expect.stringContaining("Investments"),
      expect.stringContaining("Liabilities"),
    ])
  })

  it("opens cash and leaves every other class folded", async () => {
    await renderPanel()
    const names = rowNames()
    expect(names.some((name) => name.includes("Lloyds Current"))).toBe(true)
    expect(names.some((name) => name.includes("Trading 212 ISA"))).toBe(false)
    expect(names.some((name) => name.includes("Halifax mortgage"))).toBe(false)
  })

  it("opens a folded class when its header is pressed", async () => {
    await renderPanel()
    const investments = groupHeaders().find((header) =>
      header.textContent?.includes("Investments")
    )
    expect(investments).toBeDefined()
    if (!investments) return

    await userEvent.click(investments)
    expect(rowNames().some((name) => name.includes("Trading 212 ISA"))).toBe(
      true
    )
  })

  it("puts sync trouble on the row it affects and nowhere else", async () => {
    await renderPanel({}, { "cash-1": "needsAttention", "cash-2": "active" })
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="account-row"]')
    )
    const troubled = rows.find((row) =>
      row.textContent?.includes("Lloyds Current")
    )
    const healthy = rows.find((row) =>
      row.textContent?.includes("Marcus Savings")
    )
    expect(
      troubled?.querySelector('[data-slot="sync-status"]')
    ).toHaveAttribute("data-status", "needsAttention")
    expect(healthy?.querySelector('[data-slot="sync-status"]')).toBeNull()
  })

  it("states what the liquid total includes", async () => {
    await renderPanel()
    expect(
      screen.getByText(/liquidity is sverto's own classification/i)
    ).toBeVisible()
  })

  it("says so when a rateless holding makes the totals short", async () => {
    await renderPanel({ ratelessCount: 2, isDegraded: true })
    expect(screen.getByText(/2 holdings have no exchange rate/i)).toBeVisible()
  })

  it("says so when value sits on an account it cannot list", async () => {
    await renderPanel({
      unmatchedAccountIds: ["gone"],
      unmatchedValue: 900,
    })
    expect(
      screen.getByText(/1 deactivated account still hold value/i)
    ).toBeVisible()
  })

  it("offers a way in rather than an empty panel when there are no accounts", async () => {
    await renderPanel({ accounts: [], groups: [] })
    expect(screen.getByText("No accounts yet")).toBeVisible()
    expect(screen.getByRole("link", { name: /add an account/i })).toBeVisible()
  })

  it("prints a joint account's own share on its row", async () => {
    const joint = balance("cash-3", "Joint account", "cash", 2000, {
      ownershipShare: 0.5,
      ownershipSharePercent: 50,
      isJoint: true,
    })
    const base = view()
    await renderInRouter(
      <AccountsPanelView
        view={{
          ...base,
          accounts: [...base.accounts, joint],
          groups: base.groups.map((group) =>
            group.accountClass === "cash"
              ? { ...group, accounts: [...group.accounts, joint] }
              : group
          ),
        }}
        currency="GBP"
        sync={{}}
      />
    )
    expect(
      screen.getByLabelText(/your share of joint account/i)
    ).toHaveTextContent("50%")
  })
})
