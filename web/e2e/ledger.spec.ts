import type { Page } from "@playwright/test"

import { isApiReachable } from "./support/api"
import {
  expect,
  expectNoErrorBoundary,
  gotoRoute,
  test,
} from "./support/fixtures"
import { LEDGER } from "./support/routes"
import { shellWidthOf } from "./support/widths"

const CELLS_BY_WIDTH = { full: 7, tight: 6, stacked: 4, phone: 3 } as const

function rows(page: Page) {
  return page.locator('[data-slot="ledger-row"]')
}

function sheet(page: Page) {
  return page.getByRole("dialog")
}

function sheetTitle(page: Page) {
  return sheet(page).locator('[data-slot="sheet-title"]')
}

async function skipWithoutRows(page: Page, minimum: number): Promise<void> {
  const count = await rows(page).count()
  test.skip(
    count < minimum,
    `the ledger holds ${String(count)} rows; this needs ${String(minimum)}. Start the API (make backend-run) so the e2e seed can run.`
  )
}

test.describe("ledger", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !(await isApiReachable()),
      "the API is unreachable, so there are no ledger rows to open"
    )
    await gotoRoute(page, LEDGER)
  })

  test("renders rows under the Transactions panel", async ({ page }) => {
    await skipWithoutRows(page, 1)
    await expect(page.locator('[data-slot="ledger-panel"]')).toBeVisible()
    await expect(rows(page).first()).toBeVisible()
  })

  test("sheds columns in the designed order for this width", async ({
    page,
  }) => {
    await skipWithoutRows(page, 1)
    const width = shellWidthOf(page)
    const header = page.locator('table[aria-label="Transactions"] thead tr')
    await expect(header).toHaveCount(1)
    const cells = await header.locator("> *").count()
    expect(
      cells,
      `the ledger header renders ${String(cells)} cells at "${width}"`
    ).toBe(CELLS_BY_WIDTH[width])
  })

  test("a phone row clears the 44px touch target", async ({ page }) => {
    test.skip(shellWidthOf(page) !== "phone", "phone-only rule")
    await skipWithoutRows(page, 1)
    const box = await rows(page).first().boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  })

  test("a row opens the detail panel, which steps with the up/down controls", async ({
    page,
    consoleLog,
  }) => {
    await skipWithoutRows(page, 2)

    await rows(page).first().click()
    await expect(sheet(page)).toBeVisible()

    const stepper = sheet(page).locator('[data-slot="drawer-stepper"]')
    await expect(stepper).toBeVisible()
    await expect(stepper).toContainText("1 /")

    const first = await sheetTitle(page).innerText()

    await sheet(page).getByRole("button", { name: "Next transaction" }).click()
    await expect(stepper).toContainText("2 /")
    await expect(sheetTitle(page)).not.toHaveText(first)

    await sheet(page)
      .getByRole("button", { name: "Previous transaction" })
      .click()
    await expect(stepper).toContainText("1 /")
    await expect(sheetTitle(page)).toHaveText(first)

    expect(consoleLog.errors).toEqual([])
  })

  test("Edit opens the editor and Cancel returns to the detail", async ({
    page,
  }) => {
    await skipWithoutRows(page, 1)

    await rows(page).first().click()
    await expect(
      sheet(page).getByRole("button", { name: "Add to group" })
    ).toBeVisible()

    await sheet(page).getByRole("button", { name: "Edit" }).click()
    await expect(page.locator('[data-slot="editor-body"]')).toBeVisible()

    await sheet(page).getByRole("button", { name: "Cancel" }).click()
    await expect(page.locator('[data-slot="editor-body"]')).toHaveCount(0)
    await expect(
      sheet(page).getByRole("button", { name: "Add to group" })
    ).toBeVisible()
  })

  test("closing the panel leaves the ledger intact", async ({ page }) => {
    await skipWithoutRows(page, 1)
    await rows(page).first().click()
    await expect(sheet(page)).toBeVisible()
    await sheet(page).getByRole("button", { name: "Close" }).click()
    await expect(sheet(page)).toBeHidden()
    await expect(rows(page).first()).toBeVisible()
    await expectNoErrorBoundary(page, "the ledger after closing the panel")
  })
})
