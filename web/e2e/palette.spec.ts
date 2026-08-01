import type { Page } from "@playwright/test"

import { expect, gotoRoute, settle, test } from "./support/fixtures"
import { DASHBOARD } from "./support/routes"
import { shellWidthOf } from "./support/widths"

function palette(page: Page) {
  return page.getByRole("dialog", { name: "Search or ask Myra" })
}

async function openPalette(page: Page): Promise<void> {
  await page.keyboard.press("ControlOrMeta+k")
  await expect(palette(page)).toBeVisible()
}

async function openPaletteByButton(page: Page): Promise<void> {
  const compact =
    shellWidthOf(page) === "phone" || shellWidthOf(page) === "stacked"
  await page
    .getByRole("button", {
      name: compact ? "Search or ask Myra" : "Search or ask Myra…",
    })
    .click()
  await expect(palette(page)).toBeVisible()
}

test.describe("command palette", () => {
  test("⌘K opens and Escape closes it", async ({ page, consoleLog }) => {
    await gotoRoute(page, DASHBOARD)

    await openPalette(page)
    await expect(
      palette(page).getByPlaceholder("Search or ask Myra…")
    ).toBeFocused()

    await page.keyboard.press("Escape")
    await expect(palette(page)).toBeHidden()
    expect(consoleLog.errors).toEqual([])
  })

  test("the search affordance in the chrome opens it too", async ({ page }) => {
    await gotoRoute(page, DASHBOARD)
    await openPaletteByButton(page)
  })

  test("a noun navigates", async ({ page }) => {
    await gotoRoute(page, DASHBOARD)
    await openPalette(page)

    await palette(page).getByPlaceholder("Search or ask Myra…").fill("portfoli")
    const row = palette(page)
      .getByRole("option", { name: /Portfolio/ })
      .first()
    await expect(row).toBeVisible()
    await row.click()

    await page.waitForURL("**/portfolio")
    await expect(palette(page)).toBeHidden()
    await settle(page)
    await expect(
      page.locator('[data-slot="page-header"]').first()
    ).toBeVisible()
  })

  test("a question is handed to Myra with the current page as context", async ({
    page,
  }) => {
    await gotoRoute(page, DASHBOARD)
    await openPalette(page)

    await palette(page)
      .getByPlaceholder("Search or ask Myra…")
      .fill("how much did I spend on coffee?")
    const ask = palette(page).getByRole("option", { name: /Ask Myra/ })
    await expect(ask).toBeVisible()
    await ask.click()

    await page.waitForURL(/\/ai-chat\?/)
    const url = new URL(page.url())
    expect(url.searchParams.get("ask")).toBe("how much did I spend on coffee?")
    expect(url.searchParams.get("context")).toBe("Dashboard")
    await expect(palette(page)).toBeHidden()
  })

  test("nothing matching offers Myra instead", async ({ page }) => {
    await gotoRoute(page, DASHBOARD)
    await openPalette(page)

    await palette(page)
      .getByPlaceholder("Search or ask Myra…")
      .fill("zzzqqqxyz")
    await expect(
      palette(page).getByText(
        "Nothing matches. End with a question mark to ask Myra instead."
      )
    ).toBeVisible()
  })
})
