import { fetchAnyAccountId, fetchAnyAssetId } from "./support/api"
import {
  expect,
  expectNoSideScroll,
  gotoRoute,
  settle,
  test,
} from "./support/fixtures"
import {
  accountDetailRoute,
  assetDetailRoute,
  DASHBOARD,
  LEDGER,
  STATIC_ROUTES,
} from "./support/routes"
import { shellWidthOf } from "./support/widths"

test.describe("no sideways scroll", () => {
  for (const route of STATIC_ROUTES) {
    test(route.name, async ({ page }) => {
      await gotoRoute(page, route)
      await expectNoSideScroll(page, `${route.path} at "${shellWidthOf(page)}"`)
    })
  }

  test("account detail", async ({ page }) => {
    const accountId = await fetchAnyAccountId()
    test.skip(
      accountId === null,
      "no account exists on this backend to open a detail page for"
    )
    const route = accountDetailRoute(accountId ?? "")
    await gotoRoute(page, route)
    await expectNoSideScroll(page, `${route.path} at "${shellWidthOf(page)}"`)
  })

  test("asset detail", async ({ page }) => {
    const assetId = await fetchAnyAssetId()
    test.skip(
      assetId === null,
      "no holding exists on this backend to open an asset page for"
    )
    const route = assetDetailRoute(assetId ?? 0)
    await gotoRoute(page, route)
    await expectNoSideScroll(page, `${route.path} at "${shellWidthOf(page)}"`)
  })

  test("with the transaction editor open", async ({ page }) => {
    await gotoRoute(page, LEDGER)
    await page.getByRole("button", { name: "New transaction" }).click()
    await expect(page.locator('[data-slot="type-chooser"]')).toBeVisible()
    await expectNoSideScroll(page, "the type chooser")

    await page.getByRole("button", { name: /^Purchase/ }).click()
    await expect(page.locator('[data-slot="editor-body"]')).toBeVisible()
    await settle(page)
    await expectNoSideScroll(page, "the transaction editor")
  })

  test("with the command palette open", async ({ page }) => {
    await gotoRoute(page, DASHBOARD)
    await page.keyboard.press("ControlOrMeta+k")
    await expect(
      page.getByRole("dialog", { name: "Search or ask Myra" })
    ).toBeVisible()
    await expectNoSideScroll(page, "the command palette")
  })
})
