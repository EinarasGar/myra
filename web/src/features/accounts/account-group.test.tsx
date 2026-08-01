import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { AccountGroup } from "./account-group"
import type { AccountIndexGroup, AccountIndexRow } from "./rows"
import { renderAccounts, stubViewport } from "./test-harness"

function row(overrides: Partial<AccountIndexRow> = {}): AccountIndexRow {
  return {
    accountId: "a1",
    name: "Lloyds Current",
    accountTypeId: 1,
    accountTypeName: "Current",
    accountClass: "cash",
    isLiquid: true,
    isLiability: false,
    liquidityTypeId: 1,
    liquidityTypeName: "Liquid",
    ownershipShare: 1,
    ownershipSharePercent: 100,
    isJoint: false,
    suggestedCurrencyAssetId: null,
    suggestedCurrency: null,
    value: 4183.06,
    ratelessCount: 0,
    hasHoldings: true,
    connector: null,
    unrealisedGains: null,
    ...overrides,
  }
}

function group(overrides: Partial<AccountIndexGroup> = {}): AccountIndexGroup {
  return {
    accountClass: "cash",
    label: "Cash",
    swatch: "bg-chart-1",
    accounts: [row()],
    subtotal: 24227.24,
    ratelessCount: 0,
    ...overrides,
  }
}

const CONNECTOR = {
  bindingId: "b",
  providerAccountId: "pa",
  connectionId: "c",
  accountId: "a1",
  status: "active" as const,
  statusWord: "active" as const,
  createdAt: 0,
  lastSyncAt: null,
  lastSyncFailed: false,
  lastSyncError: null,
  syncedThrough: null,
  writesPostDirectly: false,
}

beforeEach(() => {
  stubViewport(1440)
})

describe("AccountGroup", () => {
  it("names the group, counts it and totals it", async () => {
    await renderAccounts(<AccountGroup group={group()} />)
    expect(screen.getByRole("heading", { name: "Cash" })).toBeInTheDocument()
    expect(screen.getByText("1 account")).toBeInTheDocument()
    expect(screen.getByText("£24,227.24")).toBeInTheDocument()
  })

  it("links every row to its account page", async () => {
    await renderAccounts(<AccountGroup group={group()} />)
    expect(
      screen.getByRole("link", { name: "Lloyds Current" })
    ).toHaveAttribute("href", "/accounts/a1")
  })

  it("says the share in words on a joint account, not only in the chip", async () => {
    await renderAccounts(
      <AccountGroup
        group={group({
          accounts: [
            row({
              name: "Joint Bills",
              isJoint: true,
              ownershipShare: 0.5,
              ownershipSharePercent: 50,
            }),
          ],
        })}
      />
    )
    expect(screen.getByText(/your 50% share/)).toBeInTheDocument()
  })

  it("renders an em dash when the balance has no holdings behind it", async () => {
    await renderAccounts(
      <AccountGroup
        group={group({ accounts: [row({ hasHoldings: false, value: 0 })] })}
      />
    )
    expect(screen.getByLabelText("No balance yet")).toBeInTheDocument()
  })

  it("shows unrealised gain only where a priced position exists", async () => {
    await renderAccounts(
      <AccountGroup
        group={group({
          accounts: [
            row({ accountId: "a1", unrealisedGains: 1447.2 }),
            row({ accountId: "a2", name: "Cash Wallet" }),
          ],
        })}
      />
    )
    expect(screen.getAllByText("unrealised")).toHaveLength(1)
    expect(screen.getByText("+£1,447.20")).toBeInTheDocument()
  })

  it("warns when a subtotal is short because a holding has no rate", async () => {
    await renderAccounts(<AccountGroup group={group({ ratelessCount: 2 })} />)
    expect(screen.getByText(/2 holdings here have no rate/)).toBeInTheDocument()
  })

  it("keeps the connection status on the row when the column is shed", async () => {
    stubViewport(390)
    await renderAccounts(
      <AccountGroup
        group={group({ accounts: [row({ connector: CONNECTOR })] })}
      />
    )
    const table = screen.getByRole("table", { name: "Cash accounts" })
    expect(within(table).getByText("Active")).toBeInTheDocument()
    expect(
      within(table).queryByRole("columnheader", { name: "Connection" })
    ).toBeNull()
  })

  it("keeps the balance column at every width", async () => {
    for (const width of [1440, 1100, 900, 390]) {
      stubViewport(width)
      const view = await renderAccounts(<AccountGroup group={group()} />)
      expect(screen.getByText("£4,183.06")).toBeInTheDocument()
      expect(screen.getByText("£24,227.24")).toBeInTheDocument()
      view.unmount()
    }
  })
})
