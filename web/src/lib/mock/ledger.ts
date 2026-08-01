export interface MockLedgerAnchor {
  readonly asOf: string
  readonly periodDays: number
  readonly periodRangeLabel: string
  readonly netWorth: number
  readonly assets: number
  readonly liabilities: number
  readonly liquid: number
  readonly netWorthPeriodDelta: number
  readonly netWorthPeriodDeltaPercent: number
  readonly portfolioValue: number
  readonly portfolioPeriodDelta: number
  readonly activeAccounts: number
  readonly deactivatedAccounts: number
  readonly transactionsInPeriod: number
  readonly transactionsTotal: number
}

export const MOCK_LEDGER: MockLedgerAnchor = {
  asOf: "2026-07-26T17:35:00.000Z",
  periodDays: 30,
  periodRangeLabel: "26 Jun – 26 Jul 2026",
  netWorth: 192157.48,
  assets: 336879.85,
  liabilities: -144722.37,
  liquid: 24227.24,
  netWorthPeriodDelta: 2418.9,
  netWorthPeriodDeltaPercent: 1.27,
  portfolioValue: 76599.06,
  portfolioPeriodDelta: 2418.9,
  activeAccounts: 13,
  deactivatedAccounts: 2,
  transactionsInPeriod: 128,
  transactionsTotal: 412,
}

export function mockRound(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function mockSharePercent(amount: number, largest: number): number {
  if (largest === 0) return 0
  return Math.round((Math.abs(amount) / Math.abs(largest)) * 1000) / 10
}

export function mockSeededRandom(seed: string): () => number {
  let state = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index)
    state = Math.imul(state, 16777619)
  }
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return ((state >>> 0) % 1_000_000) / 1_000_000
  }
}
