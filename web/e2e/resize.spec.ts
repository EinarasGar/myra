import type { Page } from "@playwright/test"

import {
  expect,
  expectNoErrorBoundary,
  expectNoSideScroll,
  gotoRoute,
  test,
} from "./support/fixtures"
import {
  ACCOUNTS,
  DASHBOARD,
  LEDGER,
  PORTFOLIO,
  REVIEW,
  SETTINGS,
  type AppRoute,
} from "./support/routes"

const SWEEP = [1440, 1279, 1120, 1023, 860, 767, 390, 1440] as const

const HEIGHT = 900

const REPAINT_MS = 300

async function resizeTo(
  page: Page,
  width: number,
  where: string
): Promise<void> {
  await page.setViewportSize({ width, height: HEIGHT })
  await page.waitForTimeout(REPAINT_MS)
  await expectNoErrorBoundary(page, `${where} at ${String(width)}px`)
  await expectNoSideScroll(page, `${where} at ${String(width)}px`)
}

const SWEPT: readonly AppRoute[] = [
  DASHBOARD,
  LEDGER,
  REVIEW,
  PORTFOLIO,
  ACCOUNTS,
  SETTINGS,
]

test.describe("breakpoint transitions", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "the sweep drives its own viewport, so one project covers it"
    )
  })

  for (const route of SWEPT) {
    test(`${route.name} survives a resize across every breakpoint`, async ({
      page,
      consoleLog,
    }) => {
      await gotoRoute(page, route)
      consoleLog.clear()

      for (const width of SWEEP) {
        await resizeTo(page, width, route.path)
        await expect(
          page.locator(route.ready).first(),
          `${route.path} lost its content at ${String(width)}px`
        ).toBeVisible()
      }

      expect(
        consoleLog.errors,
        `resizing ${route.path} logged console errors`
      ).toEqual([])
    })
  }

  test("the transaction editor survives a resize", async ({
    page,
    consoleLog,
  }) => {
    await gotoRoute(page, LEDGER)
    await page.getByRole("button", { name: "New transaction" }).click()
    await page.getByRole("button", { name: /^Purchase/ }).click()
    await expect(page.locator('[data-slot="editor-body"]')).toBeVisible()
    consoleLog.clear()

    for (const width of SWEEP) {
      await resizeTo(page, width, "the transaction editor")
      await expect(page.locator('[data-slot="editor-body"]')).toBeVisible()
    }

    expect(consoleLog.errors).toEqual([])
  })

  test("the detail panel survives a resize", async ({ page, consoleLog }) => {
    await gotoRoute(page, LEDGER)
    const rows = page.locator('[data-slot="ledger-row"]')
    test.skip(
      (await rows.count()) === 0,
      "no ledger rows on this backend to open a panel for"
    )
    await rows.first().click()
    await expect(page.getByRole("dialog")).toBeVisible()
    consoleLog.clear()

    for (const width of SWEEP) {
      await resizeTo(page, width, "the transaction detail panel")
      await expect(page.getByRole("dialog")).toBeVisible()
    }

    expect(consoleLog.errors).toEqual([])
  })
})
