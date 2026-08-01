import type { AccountIdentifier } from "@/api"
import type { ShellWidth } from "@/components/layout/breakpoints"
import type { AccountClass } from "@/lib/domain/accounts"
import { EM_DASH, formatDateTimeStamp } from "@/lib/format"
import type { MockAccountMetadata } from "@/lib/mock"

import type { AccountConnector, AccountDetail } from "./api"
import type { AccountIndexRow } from "./rows"

export const ACCOUNT_ROW_COLUMNS = {
  full: "minmax(0,1fr) 160px 176px 14px",
  tight: "minmax(0,1fr) 140px 156px 14px",
  stacked: "minmax(0,1fr) 156px 14px",
  phone: "minmax(0,1fr) 116px",
} as const

export const ACCOUNT_ROW_GAP = { full: 16, tight: 14, stacked: 12, phone: 10 }

export const ACCOUNT_ROW_PADDING = {
  full: 18,
  tight: 16,
  stacked: 15,
  phone: 14,
}

export const HOLDINGS_COLUMNS = {
  full: "minmax(0,1fr) 96px 128px 116px 132px",
  tight: "minmax(0,1fr) 88px 116px 96px 116px",
  stacked: "minmax(0,1fr) 88px 116px 116px",
  phone: "minmax(0,1fr) 104px",
} as const

export const HOLDINGS_GAP = { full: 14, tight: 12, stacked: 12, phone: 10 }

export const HOLDINGS_PADDING = { full: 18, tight: 16, stacked: 15, phone: 14 }

export type HoldingsColumns = {
  showUnits: boolean
  showShare: boolean
  showGains: boolean
}

export function holdingsColumns(width: ShellWidth): HoldingsColumns {
  return {
    showUnits: width !== "phone",
    showShare: width === "full" || width === "tight",
    showGains: width !== "phone",
  }
}

export function holdingsCellCount(columns: HoldingsColumns): number {
  const assetAndValue = 2
  const optional = [columns.showUnits, columns.showShare, columns.showGains]
  return assetAndValue + optional.filter(Boolean).length
}

/** The connection column is the first thing to go; it moves into the sub-line. */
export function hasConnectorColumn(width: ShellWidth): boolean {
  return width === "full" || width === "tight"
}

export function accountMetaParts(row: AccountIndexRow): string[] {
  const parts = [row.accountTypeName ?? EM_DASH]
  if (row.isLiquid) parts.push("liquid")
  if (row.isJoint) {
    parts.push(`your ${String(Math.round(row.ownershipSharePercent))}% share`)
  }
  return parts
}

export function accountBalanceLabel(accountClass: AccountClass): string {
  if (accountClass === "liabilities") return "Balance owed"
  if (accountClass === "investments") return "Account value"
  return "Balance"
}

export function accountHeaderMeta(account: AccountDetail): string {
  return [
    `${String(Math.round(account.ownershipSharePercent))}% yours`,
    account.isLiquid ? "liquid" : "illiquid",
  ].join(" · ")
}

export function connectorNote(connector: AccountConnector): string {
  if (connector.lastSyncError !== null) return connector.lastSyncError
  if (connector.lastSyncAt === null) return "never synced"
  return `synced ${formatDateTimeStamp(connector.lastSyncAt)}`
}

export function maskIdentifier(identifier: AccountIdentifier): string {
  const value = identifier.value.trim()
  if (identifier.kind === "card_last4" || value.length <= 4) {
    return `•••• ${value}`
  }
  return `•••• ${value.slice(-4)}`
}

export function hasLiabilityTerms(
  metadata: MockAccountMetadata | null
): metadata is MockAccountMetadata {
  return (
    metadata !== null &&
    (metadata.interestRatePercent !== undefined ||
      metadata.monthlyPayment !== undefined ||
      metadata.interestThisYear !== undefined)
  )
}

export function ordinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return "th"
  if (day % 10 === 1) return "st"
  if (day % 10 === 2) return "nd"
  if (day % 10 === 3) return "rd"
  return "th"
}
