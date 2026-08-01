import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderAccounts } from "./test-harness"
import { UnlistedAccounts } from "./unlisted-accounts"

const ACCOUNTS = [
  {
    accountId: "9f2c81a4-0000-0000-0000-000000000001",
    value: 900,
    holdingCount: 2,
  },
  {
    accountId: "3b71cc90-0000-0000-0000-000000000002",
    value: 100,
    holdingCount: 1,
  },
]

describe("UnlistedAccounts", () => {
  it("renders nothing when every holding belongs to a listed account", async () => {
    const { container } = await renderAccounts(
      <UnlistedAccounts accounts={[]} total={0} />
    )
    expect(container.querySelector("[data-slot='fold-row']")).toBeNull()
  })

  it("folds rather than hides, and says how many", async () => {
    await renderAccounts(<UnlistedAccounts accounts={ACCOUNTS} total={1000} />)
    expect(screen.getByText("2 accounts not in this list")).toBeInTheDocument()
    expect(screen.queryByText(/9f2c81a4/)).toBeNull()
  })

  it("expands to the accounts it can still see and collapses again", async () => {
    const user = userEvent.setup()
    await renderAccounts(<UnlistedAccounts accounts={ACCOUNTS} total={1000} />)

    await user.click(screen.getByRole("button", { name: "Show" }))
    expect(screen.getByText("9f2c81a4")).toBeInTheDocument()
    expect(screen.getByText("£900.00")).toBeInTheDocument()
    expect(screen.getByText("2 holdings")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Hide" }))
    expect(screen.queryByText("9f2c81a4")).toBeNull()
  })

  it("says plainly that the names cannot be fetched rather than inventing them", async () => {
    const user = userEvent.setup()
    await renderAccounts(<UnlistedAccounts accounts={ACCOUNTS} total={1000} />)
    await user.click(screen.getByRole("button", { name: "Show" }))
    expect(screen.getByText(/cannot return their names/)).toBeInTheDocument()
  })

  it("carries no mock marker, because nothing here is invented", async () => {
    const user = userEvent.setup()
    const { container } = await renderAccounts(
      <UnlistedAccounts accounts={ACCOUNTS} total={1000} />
    )
    await user.click(screen.getByRole("button", { name: "Show" }))
    expect(container.querySelector("[data-mock]")).toBeNull()
  })
})
