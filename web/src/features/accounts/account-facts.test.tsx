import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { AccountFacts } from "./account-facts"
import type { AccountDetail } from "./api"
import { renderAccounts } from "./test-harness"

function account(overrides: Partial<AccountDetail> = {}): AccountDetail {
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
    identifiers: [],
    ...overrides,
  }
}

describe("AccountFacts", () => {
  it("states the type, whether it is a debt and whether it is spendable", async () => {
    await renderAccounts(<AccountFacts account={account()} />)
    expect(screen.getByText(/asset/)).toBeInTheDocument()
    expect(screen.getByText(/liquid/)).toBeInTheDocument()
  })

  it("explains a joint share instead of only printing a percentage", async () => {
    await renderAccounts(
      <AccountFacts
        account={account({
          isJoint: true,
          ownershipShare: 0.5,
          ownershipSharePercent: 50,
        })}
      />
    )
    expect(screen.getByText("50.0%")).toBeInTheDocument()
    expect(
      screen.getByText(/the rest belongs to someone else/)
    ).toBeInTheDocument()
  })

  it("masks an identifier until it is revealed", async () => {
    const user = userEvent.setup()
    await renderAccounts(
      <AccountFacts
        account={account({
          identifiers: [{ kind: "account_number", value: "12345678" }],
        })}
      />
    )
    expect(screen.getByText("•••• 5678")).toBeInTheDocument()
    expect(screen.queryByText("12345678")).toBeNull()

    await user.click(screen.getByRole("button", { name: "Reveal" }))
    expect(screen.getByText("12345678")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Hide" }))
    expect(screen.queryByText("12345678")).toBeNull()
  })

  it("explains the chart direction only on a liability", async () => {
    const { unmount } = await renderAccounts(
      <AccountFacts account={account()} />
    )
    expect(screen.queryByText(/climbs toward zero/)).toBeNull()
    unmount()

    await renderAccounts(
      <AccountFacts
        account={account({
          accountClass: "liabilities",
          isLiability: true,
          isLiquid: false,
        })}
      />
    )
    expect(screen.getByText(/climbs toward zero/)).toBeInTheDocument()
  })

  it("marks the institution row it invented", async () => {
    const { container } = await renderAccounts(
      <AccountFacts account={account({ name: "Marcus Savings" })} />
    )
    expect(screen.getByText("Goldman Sachs")).toBeInTheDocument()
    expect(
      container.querySelector('[data-mock="accounts.financial-metadata"]')
    ).not.toBeNull()
  })
})
