import { isCurrencyAsset } from "@/lib/domain/refs"

import type { LedgerGroupRow, NativeAmount } from "../api"
import { sumByAsset } from "../api"

/**
 * One figure per currency, never a single total: nothing converts between assets, so a group
 * whose children moved two currencies has two answers and no combined one.
 */
export function groupCashAmounts(
  group: LedgerGroupRow
): readonly NativeAmount[] {
  return sumByAsset(
    group.children
      .flatMap((child) => [
        ...child.legs.map((leg) => leg.amount),
        ...child.fees.map((fee) => fee.amount),
      ])
      .filter((amount) => isCurrencyAsset(amount.asset))
  )
}
