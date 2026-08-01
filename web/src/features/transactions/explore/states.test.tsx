import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderInRouter } from "@/features/dashboard/test-router"

import { LEDGER_EMPTY_BODY } from "./copy"
import { LedgerEmpty } from "./states"

function buttonNames() {
  return screen.getAllByRole("button").map((button) => button.textContent)
}

describe("LedgerEmpty", () => {
  it("offers every route its own copy promises", async () => {
    await renderInRouter(<LedgerEmpty onAdd={vi.fn()} onConnect={vi.fn()} />)

    expect(screen.getByText(LEDGER_EMPTY_BODY)).toBeVisible()
    expect(buttonNames()).toEqual([
      "Add a transaction",
      "Connect a bank",
      "Snap a receipt",
    ])
  })

  it("sends the receipt route to the screen that actually takes uploads", async () => {
    const user = userEvent.setup()
    const { router } = await renderInRouter(
      <LedgerEmpty onAdd={vi.fn()} onConnect={vi.fn()} />
    )

    await user.click(screen.getByRole("button", { name: "Snap a receipt" }))

    expect(router.state.location.pathname).toBe("/transactions")
    expect(router.state.location.search).toMatchObject({
      mode: "review",
      upload: "receipt",
    })
  })
})
