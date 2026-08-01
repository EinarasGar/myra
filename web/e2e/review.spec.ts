import type { Page } from "@playwright/test"

import { isApiReachable } from "./support/api"
import { expect, gotoRoute, test } from "./support/fixtures"
import { REVIEW } from "./support/routes"
import { hasKeyboardAffordances, shellWidthOf } from "./support/widths"

function card(page: Page) {
  return page.locator('[data-slot="review-card"]')
}

function progress(page: Page) {
  return page.getByRole("progressbar", { name: "Review queue progress" })
}

async function skipWithoutQueue(page: Page): Promise<void> {
  test.skip(
    (await card(page).count()) === 0,
    "the review queue is empty on this backend, so there is no card to drive"
  )
}

test.describe("review", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !(await isApiReachable()),
      "the API is unreachable, so the review queue cannot be built"
    )
    await gotoRoute(page, REVIEW)
  })

  test("the queue renders a card and a progress readout", async ({ page }) => {
    await skipWithoutQueue(page)
    await expect(card(page).first()).toBeVisible()
    await expect(progress(page)).toBeVisible()
    await expect(page.locator('[data-slot="review-fields"]')).toBeVisible()
  })

  test("key badges follow the 1024 rule", async ({ page }) => {
    await skipWithoutQueue(page)
    const badges = card(page).locator('[data-slot="key-badge"]')
    if (hasKeyboardAffordances(shellWidthOf(page))) {
      expect(
        await badges.count(),
        "no key badges at a width that has a keyboard"
      ).toBeGreaterThan(0)
      return
    }
    expect(
      await badges.count(),
      `key badges are showing at "${shellWidthOf(page)}", which has no keyboard`
    ).toBe(0)
  })

  test("j and k step the queue at >=1024", async ({ page, consoleLog }) => {
    test.skip(
      !hasKeyboardAffordances(shellWidthOf(page)),
      "keyboard shortcuts are only advertised at >=1024"
    )
    await skipWithoutQueue(page)

    const total = Number(await progress(page).getAttribute("aria-valuemax"))
    test.skip(
      total < 2,
      `the queue holds ${String(total)} item(s); j/k needs 2`
    )

    await expect(progress(page)).toHaveAttribute("aria-valuenow", "1")
    await page.keyboard.press("j")
    await expect(progress(page)).toHaveAttribute("aria-valuenow", "2")
    await page.keyboard.press("k")
    await expect(progress(page)).toHaveAttribute("aria-valuenow", "1")

    expect(consoleLog.errors).toEqual([])
  })

  test("e opens the editor from the queue at >=1024", async ({ page }) => {
    test.skip(
      !hasKeyboardAffordances(shellWidthOf(page)),
      "keyboard shortcuts are only advertised at >=1024"
    )
    await skipWithoutQueue(page)

    const edit = card(page)
      .getByRole("button", { name: /Open detail|Open editor/ })
      .first()
    await expect(edit).toBeVisible()
    test.skip(
      !(await edit.isEnabled()),
      "the item at the head of the queue cannot be opened from here"
    )

    await page.keyboard.press("e")
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.locator('[data-slot="editor-body"]')).toBeVisible()
  })

  test("the mode switch returns to Explore", async ({ page }) => {
    await page.getByRole("button", { name: "Explore" }).click()
    await page.waitForURL(/mode=explore/)
    await expect(page.locator("h1")).toHaveText("Transactions")
  })
})
