import type { Page } from "@playwright/test"

import {
  expect,
  expectNoErrorBoundary,
  gotoRoute,
  settle,
  test,
} from "./support/fixtures"
import { DASHBOARD } from "./support/routes"
import { shellWidthOf } from "./support/widths"

const RAIL_TARGETS = ["/", "/transactions", "/portfolio", "/accounts"]
const RAIL_ASIDE_TARGETS = ["/ai-chat"]
const TAB_TARGETS = [
  "/",
  "/transactions",
  "/transactions?mode=review",
  "/portfolio",
  "/ai-chat",
]
const MENU_TARGETS = [
  "/",
  "/transactions",
  "/portfolio",
  "/accounts",
  "/ai-chat",
  "/settings",
]

async function openMenuIfNeeded(page: Page): Promise<void> {
  if (shellWidthOf(page) !== "stacked") return
  await page.getByRole("button", { name: "Open navigation" }).click()
}

function pathOf(target: string): string {
  return target.split("?")[0] ?? target
}

function destinationLink(target: string): string {
  return `a[href="${target}"]:not([aria-label="Sverto home"])`
}

function expectedTargets(page: Page): string[] {
  switch (shellWidthOf(page)) {
    case "phone":
      return TAB_TARGETS
    case "stacked":
      return MENU_TARGETS
    default:
      return [...RAIL_TARGETS, ...RAIL_ASIDE_TARGETS]
  }
}

test.describe("navigation", () => {
  test("every primary destination is present exactly once", async ({
    page,
  }) => {
    await gotoRoute(page, DASHBOARD)
    await openMenuIfNeeded(page)

    const nav = page.getByRole("navigation", { name: "Primary" })
    await expect(nav).toBeVisible()

    for (const target of expectedTargets(page)) {
      await expect(
        nav.locator(destinationLink(target)),
        `no primary nav link points at ${target}`
      ).toHaveCount(1)
    }
  })

  test("every primary destination resolves", async ({ page, consoleLog }) => {
    await gotoRoute(page, DASHBOARD)

    for (const target of expectedTargets(page)) {
      await openMenuIfNeeded(page)
      const nav = page.getByRole("navigation", { name: "Primary" })
      await nav.locator(destinationLink(target)).click()
      await page.waitForURL((url) => url.pathname === pathOf(target))
      await settle(page)

      const landed = page
        .locator('[data-slot="page-header"], [data-slot="dashboard"]')
        .first()
      await expect(landed, `${target} dead-ended`).toBeVisible()
      await expectNoErrorBoundary(page, target)
    }

    expect(consoleLog.errors, "navigating produced console errors").toEqual([])
  })

  test("the profile menu reaches settings", async ({ page }) => {
    await gotoRoute(page, DASHBOARD)

    await page.getByRole("button", { name: /Account menu/ }).click()
    await page.getByRole("menu").getByRole("link", { name: "Settings" }).click()

    await page.waitForURL((url) => url.pathname === "/settings")
    await expect(
      page.locator('[data-slot="page-header"]').first()
    ).toBeVisible()
  })

  test("an unknown address renders the not-found state, not a crash", async ({
    page,
  }) => {
    await page.goto("/definitely-not-a-page")
    await expect(page.locator('[data-slot="route-not-found"]')).toBeVisible()
    await page.getByRole("link", { name: /Back to the dashboard/ }).click()
    await expect(page.locator('[data-slot="dashboard"]')).toBeVisible()
  })
})
