import { test as base, expect, type Page } from "@playwright/test"

import type { AppRoute } from "./routes"

const IGNORED_CONSOLE: readonly RegExp[] = [
  /Download the React DevTools/i,
  /^\[vite\]/i,
  /net::ERR_/,
  /favicon\.ico/,
  /ResizeObserver loop/,
]

function isIgnorable(text: string): boolean {
  return IGNORED_CONSOLE.some((pattern) => pattern.test(text))
}

export interface ConsoleLog {
  readonly errors: string[]
  clear: () => void
}

const HIDE_DEVTOOLS = `
[aria-label="Open TanStack Router Devtools"],
[aria-label="Open Tanstack query devtools"],
.tsqd-parent-container,
.TanStackRouterDevtools { display: none !important; }
`

export const test = base.extend<{ consoleLog: ConsoleLog }>({
  page: async ({ page }, provide) => {
    await page.addInitScript((css: string) => {
      const inject = () => {
        const style = document.createElement("style")
        style.textContent = css
        ;(
          (document.head as HTMLElement | null) ?? document.documentElement
        ).append(style)
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inject)
        return
      }
      inject()
    }, HIDE_DEVTOOLS)
    await provide(page)
  },
  consoleLog: async ({ page }, provide) => {
    const errors: string[] = []
    page.on("console", (message) => {
      if (message.type() !== "error") return
      const text = message.text()
      if (isIgnorable(text)) return
      errors.push(text)
    })
    page.on("pageerror", (error) => {
      errors.push(`uncaught: ${error.message}`)
    })
    await provide({
      errors,
      clear: () => {
        errors.length = 0
      },
    })
  },
})

export { expect }

export async function settle(page: Page): Promise<void> {
  await page
    .waitForLoadState("networkidle", { timeout: 6000 })
    .catch(() => undefined)
  await page
    .locator('[data-slot="skeleton"]')
    .first()
    .waitFor({ state: "detached", timeout: 6000 })
    .catch(() => undefined)
}

export async function gotoRoute(page: Page, route: AppRoute): Promise<void> {
  await page.goto(route.path)
  await expect(page.locator(route.ready).first()).toBeVisible({
    timeout: 20_000,
  })
  await settle(page)
}

export async function setTheme(
  page: Page,
  theme: "light" | "dark"
): Promise<void> {
  await page.addInitScript(
    ([value]) => {
      window.localStorage.setItem("theme", value as string)
    },
    [theme]
  )
}

export interface OverflowReport {
  readonly scrollWidth: number
  readonly clientWidth: number
  readonly offenders: readonly string[]
}

export async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const root = document.documentElement
    const limit = root.clientWidth
    const scrolls = (element: Element): boolean => {
      let node: Element | null = element.parentElement
      while (node !== null) {
        const overflowX = window.getComputedStyle(node).overflowX
        if (overflowX === "auto" || overflowX === "scroll") return true
        node = node.parentElement
      }
      return false
    }
    const offenders: string[] = []
    for (const element of Array.from(document.body.querySelectorAll("*"))) {
      const rect = element.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      if (rect.right <= limit + 1) continue
      if (scrolls(element)) continue
      const slot = element.getAttribute("data-slot")
      const label = slot === null ? "" : ` data-slot="${slot}"`
      offenders.push(
        `<${element.tagName.toLowerCase()}${label}> right=${String(Math.round(rect.right))}`
      )
    }
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: limit,
      offenders: offenders.slice(0, 8),
    }
  })
}

export async function expectNoSideScroll(
  page: Page,
  where: string
): Promise<void> {
  const report = await measureOverflow(page)
  expect(
    report.scrollWidth,
    `${where} scrolls sideways: scrollWidth ${String(report.scrollWidth)} > clientWidth ${String(report.clientWidth)}. Widest offenders: ${report.offenders.join(" | ")}`
  ).toBeLessThanOrEqual(report.clientWidth + 1)
}

export async function expectNoErrorBoundary(
  page: Page,
  where: string
): Promise<void> {
  const cards = page.locator('[data-state="error"]')
  const count = await cards.count()
  const headlines = count === 0 ? [] : await cards.allInnerTexts()
  expect(
    count,
    `${where} rendered an error state: ${headlines.join(" // ").replace(/\s+/g, " ")}`
  ).toBe(0)
  await expect(
    page.locator('[data-slot="route-error"]'),
    `${where} rendered the route error boundary`
  ).toHaveCount(0)
}
