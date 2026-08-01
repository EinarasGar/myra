import { test } from "@playwright/test"

const OUT = "../.shots"

const HIDE = `
  [data-slot="needs-you"],
  [data-slot="mock-badge"],
  [data-slot="hero-chart-label"] { display: none !important; }
  .tsqd-parent-container,
  button[aria-label*="TanStack" i] { display: none !important; }
`

const ROWS =
  '[data-slot="ledger-row"],[data-slot="ledger-child-row"],[data-slot="account-row"]'

test.use({ deviceScaleFactor: 2, viewport: { width: 1280, height: 860 } })

for (const scheme of ["dark", "light"] as const) {
  test(`web-dashboard-${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" })
    await page.goto("/", { waitUntil: "networkidle" })
    await page.addStyleTag({ content: HIDE })
    await page.waitForTimeout(2500)

    // Crop to the last row that fits, so a panel never ends mid-row.
    const cutoff = await page.evaluate((rows) => {
      const limit = window.innerHeight
      let last = 0
      for (const row of document.querySelectorAll(rows)) {
        const bottom = row.getBoundingClientRect().bottom
        if (bottom <= limit) last = Math.max(last, bottom)
      }
      return Math.round(last || limit)
    }, ROWS)

    await page.screenshot({
      path: `${OUT}/web-dashboard-${scheme}.png`,
      clip: { x: 0, y: 0, width: 1280, height: cutoff },
    })
  })
}
