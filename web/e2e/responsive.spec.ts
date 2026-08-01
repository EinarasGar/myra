import type { Locator, Page } from "@playwright/test"

import { expect, gotoRoute, test } from "./support/fixtures"
import { DASHBOARD, LEDGER } from "./support/routes"
import { hasKeyboardAffordances, shellWidthOf } from "./support/widths"

const RAIL_WIDTH = 58

function primaryNav(page: Page): Locator {
  return page.locator('nav[aria-label="Primary"]')
}

async function isRail(nav: Locator): Promise<boolean> {
  const box = await nav.boundingBox()
  if (box === null) return false
  return Math.abs(box.width - RAIL_WIDTH) <= 1 && box.x <= 1
}

async function isBottomBar(nav: Locator, page: Page): Promise<boolean> {
  const box = await nav.boundingBox()
  const viewport = page.viewportSize()
  if (box === null || viewport === null) return false
  return (
    Math.abs(box.width - viewport.width) <= 1 &&
    box.y + box.height >= viewport.height - 2
  )
}

test.describe("responsive structure", () => {
  test.beforeEach(async ({ page }) => {
    await gotoRoute(page, DASHBOARD)
  })

  test("the shell picks the right primary navigation", async ({ page }) => {
    const width = shellWidthOf(page)
    const navs = primaryNav(page)

    if (width === "full" || width === "tight") {
      await expect(navs).toHaveCount(1)
      expect(await isRail(navs), `no 58px icon rail at "${width}"`).toBe(true)
      await expect(
        page.getByRole("button", { name: "Open navigation" })
      ).toHaveCount(0)
      return
    }

    if (width === "stacked") {
      await expect(
        page.getByRole("button", { name: "Open navigation" })
      ).toBeVisible()
      expect(
        await navs.count(),
        "a persistent primary nav is still mounted at the stacked width"
      ).toBe(0)
      return
    }

    await expect(navs).toHaveCount(1)
    expect(await isBottomBar(navs, page), "no bottom tab bar on phone").toBe(
      true
    )
    await expect(navs.locator("a")).toHaveCount(5)
    await expect(
      page.getByRole("button", { name: "Open navigation" })
    ).toBeVisible()
  })

  test("the menu drawer opens at the stacked width", async ({ page }) => {
    test.skip(shellWidthOf(page) !== "stacked", "stacked-only rule")
    await page.getByRole("button", { name: "Open navigation" }).click()
    const nav = primaryNav(page)
    await expect(nav).toBeVisible()
    await expect(nav.locator("a")).toHaveCount(6)
  })

  test("keyboard affordances hide below 1024", async ({ page }) => {
    const width = shellWidthOf(page)
    await page.keyboard.press("ControlOrMeta+k")
    const dialog = page.getByRole("dialog", { name: "Search or ask Myra" })
    await expect(dialog).toBeVisible()

    const escHint = dialog.getByText("esc", { exact: true })
    if (hasKeyboardAffordances(width)) {
      await expect(escHint).toBeVisible()
      return
    }
    await expect(
      escHint,
      `the palette advertises a keyboard at "${width}"`
    ).toBeHidden()
  })

  test("figures never truncate and never wrap", async ({ page }) => {
    await gotoRoute(page, LEDGER)
    const offenders = await page.evaluate(() => {
      const bad: string[] = []
      for (const node of Array.from(
        document.querySelectorAll("[data-figure]")
      )) {
        const rect = node.getBoundingClientRect()
        if (rect.width === 0) continue
        const style = window.getComputedStyle(node)
        const lineHeight = Number.parseFloat(style.lineHeight)
        const clipped = node.scrollWidth > node.clientWidth + 1
        const wrapped =
          Number.isFinite(lineHeight) && rect.height > lineHeight * 1.6
        if (clipped || wrapped) {
          bad.push(
            `${node.textContent ?? ""} (${clipped ? "clipped" : "wrapped"})`
          )
        }
      }
      return bad
    })
    expect(offenders, "figures are being cut off").toEqual([])
  })
})
