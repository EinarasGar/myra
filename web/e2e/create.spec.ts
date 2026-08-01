import type { Page } from "@playwright/test"

import {
  expect,
  expectNoErrorBoundary,
  gotoRoute,
  test,
} from "./support/fixtures"
import { LEDGER } from "./support/routes"

function sheet(page: Page) {
  return page.getByRole("dialog")
}

async function openCreate(page: Page): Promise<void> {
  await page.getByRole("button", { name: "New transaction" }).click()
  await expect(sheet(page)).toBeVisible()
}

test.describe("create", () => {
  test.beforeEach(async ({ page }) => {
    await gotoRoute(page, LEDGER)
  })

  test("the header action opens the editor with the type chooser as step 0", async ({
    page,
    consoleLog,
  }) => {
    await openCreate(page)

    await expect(page.locator('[data-slot="type-chooser"]')).toBeVisible()
    await expect(sheet(page).locator('[data-slot="sheet-title"]')).toHaveText(
      "New transaction"
    )
    await expect(sheet(page).getByText("Pick a type to start.")).toBeVisible()
    await expect(
      sheet(page).getByRole("button", { name: "Save transaction" })
    ).toHaveCount(0)

    expect(consoleLog.errors).toEqual([])
  })

  test("the chooser filters, and picking a type reveals the form", async ({
    page,
  }) => {
    await openCreate(page)

    await page.getByLabel("Filter transaction types").fill("div")
    await expect(
      page.getByRole("button", { name: /Cash dividend/ })
    ).toBeVisible()
    await expect(page.getByRole("button", { name: /^Purchase/ })).toHaveCount(0)

    await page.getByLabel("Filter transaction types").fill("zzzz")
    await expect(page.getByText("No type matches that.")).toBeVisible()

    await page.getByLabel("Filter transaction types").fill("")
    await page.getByRole("button", { name: /^Purchase/ }).click()

    await expect(page.locator('[data-slot="type-chooser"]')).toHaveCount(0)
    await expect(page.getByLabel("Date")).toBeVisible()
    await expect(
      sheet(page).getByRole("button", { name: "Save transaction" })
    ).toBeVisible()
  })

  test("switching type keeps typed input", async ({ page }) => {
    await openCreate(page)
    await page.getByRole("button", { name: /^Purchase/ }).click()

    await page.getByLabel("Date").fill("3 days ago")
    await expect(page.locator('[data-slot="date-echo"]')).toBeVisible()
    const echoed = await page.locator('[data-slot="date-echo"]').innerText()

    await sheet(page).getByRole("button", { name: "Change type" }).click()
    await expect(page.locator('[data-slot="type-chooser"]')).toBeVisible()
    await page.getByRole("button", { name: /^Cash out/ }).click()

    await expect(page.getByLabel("Date")).toHaveValue("3 days ago")
    await expect(page.locator('[data-slot="date-echo"]')).toHaveText(echoed)
    await expectNoErrorBoundary(page, "the editor after a type switch")
  })

  test("closing a dirty editor asks before discarding", async ({ page }) => {
    await openCreate(page)
    await page.getByRole("button", { name: /^Purchase/ }).click()
    await page.getByLabel("Date").fill("yesterday")

    await sheet(page).getByRole("button", { name: "Cancel" }).click()
    await expect(
      sheet(page).getByText("Discard this transaction?")
    ).toBeVisible()

    await sheet(page).getByRole("button", { name: "Keep editing" }).click()
    await expect(page.getByLabel("Date")).toHaveValue("yesterday")

    await sheet(page).getByRole("button", { name: "Cancel" }).click()
    await sheet(page).getByRole("button", { name: "Discard" }).click()
    await expect(sheet(page)).toBeHidden()
  })
})
