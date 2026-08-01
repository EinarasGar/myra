import type { ShellWidth } from "@/components/layout/breakpoints"
import { columnTrackCount } from "@/components/primitives"

export const HOLDINGS_COLUMNS = {
  full: "minmax(0,1fr) 104px 116px 92px 132px 132px 16px",
  tight: "minmax(0,1fr) 96px 108px 120px 120px 14px",
  stacked: "minmax(0,1fr) 112px 112px 116px",
  phone: "minmax(0,1fr) 116px",
} as const

export const HOLDINGS_GAP = { full: 14, tight: 12, stacked: 12, phone: 10 }

export const HOLDINGS_PADDING = { full: 18, tight: 16, stacked: 15, phone: 14 }

export interface HoldingsColumns {
  showUnits: boolean
  showShare: boolean
  showPeriod: boolean
  showLifetime: boolean
  showCaret: boolean
  isTwoLine: boolean
}

export function holdingsColumns(width: ShellWidth): HoldingsColumns {
  const full = width === "full"
  const wide = full || width === "tight"
  const phone = width === "phone"
  return {
    showUnits: wide,
    showShare: full,
    showPeriod: !phone,
    showLifetime: !phone,
    showCaret: wide,
    isTwoLine: !wide,
  }
}

export function holdingsCellCount(columns: HoldingsColumns): number {
  const assetAndValue = 2
  const optional = [
    columns.showUnits,
    columns.showShare,
    columns.showPeriod,
    columns.showLifetime,
    columns.showCaret,
  ]
  return assetAndValue + optional.filter(Boolean).length
}

export function holdingsTrackCount(width: ShellWidth): number {
  return columnTrackCount(HOLDINGS_COLUMNS[width])
}

export function holdingsRowHeight(width: ShellWidth): string {
  return holdingsColumns(width).isTwoLine ? "h-[58px]" : "h-[54px]"
}

export const LOT_COLUMNS = {
  full: "84px minmax(0,1fr) 108px 88px 96px 100px 92px 92px 66px 72px",
  tight: "78px minmax(0,1fr) 96px 84px 92px 96px 88px 88px",
  stacked: "76px minmax(0,1fr) 88px 96px 100px",
  phone: "72px minmax(0,1fr) 92px",
} as const

export const LOT_GAP = { full: 12, tight: 12, stacked: 12, phone: 10 }

export const LOT_PADDING = { full: 18, tight: 16, stacked: 15, phone: 14 }

export interface LotColumns {
  showUnitsLeft: boolean
  showBuyPrice: boolean
  showCostBasis: boolean
  showUnrealised: boolean
  showRealised: boolean
  showReturn: boolean
  showFees: boolean
  isTwoLine: boolean
}

export function lotColumns(width: ShellWidth): LotColumns {
  const full = width === "full"
  const wide = full || width === "tight"
  const phone = width === "phone"
  return {
    showUnitsLeft: !phone,
    showBuyPrice: wide,
    showCostBasis: !phone,
    showUnrealised: wide,
    showRealised: wide,
    showReturn: full,
    showFees: full,
    isTwoLine: phone,
  }
}

export function lotCellCount(columns: LotColumns): number {
  const boughtAccountTotal = 3
  const optional = [
    columns.showUnitsLeft,
    columns.showBuyPrice,
    columns.showCostBasis,
    columns.showUnrealised,
    columns.showRealised,
    columns.showReturn,
    columns.showFees,
  ]
  return boughtAccountTotal + optional.filter(Boolean).length
}

export function lotTrackCount(width: ShellWidth): number {
  return columnTrackCount(LOT_COLUMNS[width])
}

export function lotRowHeight(width: ShellWidth): string {
  return lotColumns(width).isTwoLine ? "h-[58px]" : "h-[48px]"
}

/** Eight tiles read as two rows of four, or two columns of four when stacked. */
export const TILE_GRID = "grid-cols-2 lg:grid-cols-4"

export const HOLDINGS_ROWS_DRAWN = 8

export const LOT_ROWS_DRAWN = 12
