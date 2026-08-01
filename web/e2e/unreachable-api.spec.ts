import { expect, expectNoSideScroll, settle, test } from "./support/fixtures"

test.describe("an unreachable API", () => {
  test("shows the designed identity-unavailable state, not a blank page", async ({
    page,
  }) => {
    await page.route(
      (url) => url.pathname.startsWith("/api/"),
      (route) => route.abort("connectionrefused")
    )

    await page.goto("/")
    const panel = page.locator('[data-slot="identity-unavailable"]')
    await expect(panel).toBeVisible({ timeout: 20_000 })
    await expect(panel).toContainText("Can't reach the Sverto server")
    await expect(panel).toContainText("make backend-run")
    await expect(panel.getByRole("button", { name: "Try again" })).toBeVisible()
    await expectNoSideScroll(page, "the identity-unavailable state")
  })

  test("a dead ledger endpoint degrades the screen, not the shell", async ({
    page,
  }) => {
    await page.route("**/api/users/*/transactions**", (route) =>
      route.abort("connectionrefused")
    )

    await page.goto("/transactions")
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible({
      timeout: 20_000,
    })
    await settle(page)

    await expect(page.getByText("Can't reach Sverto")).toBeVisible()
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "New transaction" }),
      "the header action vanished with the failing panel"
    ).toBeVisible()
    await expectNoSideScroll(page, "/transactions with a dead ledger endpoint")
  })

  test("a 500 from the ledger renders the server-error state", async ({
    page,
  }) => {
    await page.route("**/api/users/*/transactions**", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "boom" }),
      })
    )

    await page.goto("/transactions")
    await expect(page.locator('[data-slot="page-header"]')).toBeVisible({
      timeout: 20_000,
    })
    await settle(page)

    await expect(
      page.locator('[data-state="degraded"], [data-state="error"]').first()
    ).toBeVisible()
    await expectNoSideScroll(page, "/transactions with a 500 ledger")
  })
})
