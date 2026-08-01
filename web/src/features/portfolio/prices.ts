import type { MockId } from "@/lib/mock"
import { mockPricesAreStale, mockPricesAsOf } from "@/lib/mock"

export const PRICES_AS_OF_MOCK_ID: MockId = "portfolio.prices-as-of"

export interface PricesAsOf {
  asOf: Date
  isStale: boolean
  mockId: MockId
}

export interface PricesAsOfOptions {
  now?: Date
  ageMinutes?: number
}

export function pricesAsOf(options: PricesAsOfOptions = {}): PricesAsOf {
  const now = options.now ?? new Date()
  const asOf = mockPricesAsOf({
    now,
    ...(options.ageMinutes === undefined
      ? {}
      : { ageMinutes: options.ageMinutes }),
  })
  return {
    asOf,
    isStale: mockPricesAreStale(asOf, now),
    mockId: PRICES_AS_OF_MOCK_ID,
  }
}
