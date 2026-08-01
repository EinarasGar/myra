import { act, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import type { HistorySeries } from "@/features/portfolio/api"

const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2026, 5, 26)

const VALUES: Record<string, [number, number]> = {
  "1m": [10_000, 12_500],
  "1y": [4000, 12_500],
}

interface Gate {
  promise: Promise<void>
  release: () => void
  settled: boolean
}

const gates = new Map<string, Gate>()

function gateFor(range: string): Gate {
  const existing = gates.get(range)
  if (existing) return existing
  let release = () => {}
  const gate: Gate = {
    promise: new Promise<void>((resolve) => {
      release = () => {
        gate.settled = true
        resolve()
      }
    }),
    release: () => release(),
    settled: false,
  }
  gates.set(range, gate)
  return gate
}

async function releaseRange(range: string) {
  await act(async () => {
    gateFor(range).release()
    await gateFor(range).promise
  })
}

function seriesFor(range: string): HistorySeries {
  const [first, last] = VALUES[range] ?? [0, 0]
  return {
    range: range as HistorySeries["range"],
    points: [
      { timestamp: START, value: first },
      { timestamp: START + 15 * DAY, value: (first + last) / 2 },
      { timestamp: START + 30 * DAY, value: last },
    ],
    first,
    last,
    min: Math.min(first, last),
    max: Math.max(first, last),
    change: last - first,
    changeRatio: (last - first) / first,
    isEmpty: false,
  }
}

vi.mock("@/features/portfolio/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/portfolio/api")>()),
  useRequiredBaseAssetId: () => 1,
  useAccountPortfolioHistorySuspense: ({ range }: { range: string }) => {
    const gate = gateFor(range)
    if (!gate.settled) throw gate.promise
    return seriesFor(range)
  },
}))

const { AccountHero } = await import("./account-hero")
const { renderAccounts, stubViewport } = await import("./test-harness")

function value(): string {
  return (
    document.querySelector('[data-slot="hero-chart-value"]')?.textContent ?? ""
  )
}

function skeleton(): HTMLElement | null {
  return document.querySelector('[data-slot="hero-chart-skeleton"]')
}

beforeEach(() => {
  gates.clear()
  stubViewport(1440)
})

describe("AccountHero", () => {
  it("holds the skeleton, with its period control, until the first window lands", async () => {
    await renderAccounts(<AccountHero accountId="a1" accountClass="cash" />)
    expect(skeleton()).not.toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading account history"
    )
    expect(screen.getByRole("group", { name: /chart period/i })).toBeVisible()

    await releaseRange("1m")
    expect(skeleton()).toBeNull()
    expect(value()).toContain("12,500.00")
  })

  it("keeps the chart on screen while the next period loads instead of flashing the skeleton", async () => {
    await renderAccounts(<AccountHero accountId="a1" accountClass="cash" />)
    await releaseRange("1m")

    await userEvent.click(screen.getByRole("button", { name: "1Y" }))

    expect(skeleton()).toBeNull()
    expect(value()).toContain("12,500.00")

    await releaseRange("1y")
    expect(skeleton()).toBeNull()
    expect(
      document.querySelector('[data-slot="hero-chart-delta"]')?.textContent
    ).toContain("8,500.00")
  })

  it("draws a liability account downward without recolouring it", async () => {
    await renderAccounts(
      <AccountHero accountId="a1" accountClass="liabilities" />
    )
    await releaseRange("1m")
    expect(document.querySelector('[data-slot="hero-chart"]')).toHaveAttribute(
      "data-shape",
      "liability"
    )
  })

  it.each([1440, 1100, 900, 390])(
    "keeps the period control through the skeleton handoff at %spx",
    async (viewportWidth) => {
      stubViewport(viewportWidth)
      await renderAccounts(<AccountHero accountId="a1" accountClass="cash" />)
      expect(screen.getByRole("group", { name: /chart period/i })).toBeVisible()

      await releaseRange("1m")
      expect(skeleton()).toBeNull()
      expect(screen.getByRole("group", { name: /chart period/i })).toBeVisible()
    }
  )
})
