import {
  expect,
  expectNoErrorBoundary,
  gotoRoute,
  setTheme,
  test,
} from "./support/fixtures"
import { DASHBOARD } from "./support/routes"

test.describe("boot", () => {
  test("loads the dashboard with the shell and no console error", async ({
    page,
    consoleLog,
  }) => {
    await gotoRoute(page, DASHBOARD)

    await expect(page.locator('[data-slot="dashboard"]')).toBeVisible()
    await expect(page.locator('[data-slot="boot-skeleton"]')).toHaveCount(0)
    await expect(page).toHaveTitle(/Sverto/)
    await expectNoErrorBoundary(page, "the dashboard")

    expect(consoleLog.errors, "boot produced console errors").toEqual([])
  })

  test("renders in the dark theme", async ({ page, consoleLog }) => {
    await setTheme(page, "dark")
    await gotoRoute(page, DASHBOARD)

    await expect(page.locator("html")).toHaveClass(/\bdark\b/)
    const background = await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundColor
    )
    expect(background, "dark theme left the body transparent").not.toBe(
      "rgba(0, 0, 0, 0)"
    )
    expect(consoleLog.errors).toEqual([])
  })

  test("renders in the light theme", async ({ page, consoleLog }) => {
    await setTheme(page, "light")
    await gotoRoute(page, DASHBOARD)

    await expect(page.locator("html")).toHaveClass(/\blight\b/)
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/)
    expect(consoleLog.errors).toEqual([])
  })

  test("the profile menu switches theme and repaints", async ({ page }) => {
    await setTheme(page, "light")
    await gotoRoute(page, DASHBOARD)
    const light = await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundColor
    )

    await page.getByRole("button", { name: /Account menu/ }).click()
    await page
      .getByRole("group", { name: "Theme" })
      .getByRole("button", { name: "Dark" })
      .click()

    await expect(page.locator("html")).toHaveClass(/\bdark\b/)
    const dark = await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundColor
    )

    expect(dark, "light and dark resolved to the same background").not.toBe(
      light
    )
  })
})
