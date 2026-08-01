import { test } from "@playwright/test"

const WIDTHS = [
  { name: "phone", width: 390, height: 1100 },
  { name: "stacked", width: 820, height: 1100 },
  { name: "desktop", width: 1280, height: 900 },
]

for (const size of WIDTHS) {
  test(`landing 07 at ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height })
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
    await page.goto("http://localhost:8099/", { waitUntil: "networkidle" })
    const section = page.locator("#apps")
    await section.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1200)
    await section.screenshot({ path: `../.shots/landing-07-${size.name}.png` })
  })
}
