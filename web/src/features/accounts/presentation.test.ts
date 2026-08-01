import { describe, expect, it } from "vitest"

import { SHELL_WIDTHS } from "@/components/layout/breakpoints"
import {
  columnTemplateMinWidth,
  columnTrackCount,
  MAX_TABLE_WIDTH,
  resolveColumnLayout,
} from "@/components/primitives"
import { EM_DASH } from "@/lib/format"

import type { AccountConnector, AccountDetail } from "./api"
import {
  ACCOUNT_ROW_COLUMNS,
  ACCOUNT_ROW_GAP,
  ACCOUNT_ROW_PADDING,
  accountBalanceLabel,
  accountHeaderMeta,
  accountMetaParts,
  connectorNote,
  hasConnectorColumn,
  hasLiabilityTerms,
  holdingsCellCount,
  holdingsColumns,
  HOLDINGS_COLUMNS,
  HOLDINGS_GAP,
  HOLDINGS_PADDING,
  maskIdentifier,
  ordinalSuffix,
} from "./presentation"
import type { AccountIndexRow } from "./rows"

function row(overrides: Partial<AccountIndexRow> = {}): AccountIndexRow {
  return {
    accountId: "a1",
    name: "Joint Bills",
    accountTypeId: 1,
    accountTypeName: "Current",
    accountClass: "cash",
    isLiquid: true,
    isLiability: false,
    liquidityTypeId: 1,
    liquidityTypeName: "Liquid",
    ownershipShare: 1,
    ownershipSharePercent: 100,
    isJoint: false,
    suggestedCurrencyAssetId: null,
    suggestedCurrency: null,
    value: 0,
    ratelessCount: 0,
    hasHoldings: true,
    connector: null,
    unrealisedGains: null,
    ...overrides,
  }
}

function connector(
  overrides: Partial<AccountConnector> = {}
): AccountConnector {
  return {
    bindingId: "b",
    providerAccountId: "pa",
    connectionId: "c",
    accountId: "a1",
    status: "active",
    statusWord: "active",
    createdAt: 0,
    lastSyncAt: null,
    lastSyncFailed: false,
    lastSyncError: null,
    syncedThrough: null,
    writesPostDirectly: false,
    ...overrides,
  }
}

describe("accountMetaParts", () => {
  it("always states the share on a joint account", () => {
    expect(
      accountMetaParts(row({ isJoint: true, ownershipSharePercent: 50 }))
    ).toContain("your 50% share")
  })

  it("says nothing about a share you own outright", () => {
    expect(accountMetaParts(row()).join(" ")).not.toContain("share")
  })

  it("prints an em dash rather than a blank when the type is unresolved", () => {
    expect(accountMetaParts(row({ accountTypeName: null }))[0]).toBe(EM_DASH)
  })

  it("only claims liquidity when the taxonomy says so", () => {
    expect(accountMetaParts(row({ isLiquid: false }))).not.toContain("liquid")
  })
})

describe("accountBalanceLabel", () => {
  it("reads debt-shaped for a liability", () => {
    expect(accountBalanceLabel("liabilities")).toBe("Balance owed")
  })

  it.each(["cash", "property", "other"] as const)(
    "calls %s a balance",
    (accountClass) => {
      expect(accountBalanceLabel(accountClass)).toBe("Balance")
    }
  )

  it("calls an investment account a value", () => {
    expect(accountBalanceLabel("investments")).toBe("Account value")
  })
})

describe("accountHeaderMeta", () => {
  it("states the ownership share and liquidity", () => {
    expect(
      accountHeaderMeta({
        ownershipSharePercent: 50,
        isLiquid: false,
      } as AccountDetail)
    ).toBe("50% yours · illiquid")
  })
})

describe("connectorNote", () => {
  it("prefers the provider's own error over a timestamp", () => {
    expect(
      connectorNote(
        connector({ lastSyncError: "consent expired", lastSyncAt: 1 })
      )
    ).toBe("consent expired")
  })

  it("says never synced rather than showing an epoch", () => {
    expect(connectorNote(connector())).toBe("never synced")
  })
})

describe("maskIdentifier", () => {
  it("shows only the last four of an account number", () => {
    const masked = maskIdentifier({
      kind: "account_number",
      value: "12345678",
    })
    expect(masked).toBe("•••• 5678")
    expect(masked).not.toContain("1234")
  })

  it("never reveals more than it was given for a card", () => {
    expect(maskIdentifier({ kind: "card_last4", value: "4417" })).toBe(
      "•••• 4417"
    )
  })

  it("does not slice a short value into nothing", () => {
    expect(maskIdentifier({ kind: "iban", value: "17" })).toBe("•••• 17")
  })
})

describe("hasLiabilityTerms", () => {
  it("is false when the mock knows only an institution", () => {
    expect(hasLiabilityTerms({ institution: "Halifax" })).toBe(false)
  })

  it("is false when there is no metadata at all", () => {
    expect(hasLiabilityTerms(null)).toBe(false)
  })

  it("is true as soon as one lending term exists", () => {
    expect(hasLiabilityTerms({ interestRatePercent: 4.29 })).toBe(true)
  })
})

describe("ordinalSuffix", () => {
  it.each([
    [1, "st"],
    [2, "nd"],
    [3, "rd"],
    [4, "th"],
    [11, "th"],
    [12, "th"],
    [13, "th"],
    [21, "st"],
    [28, "th"],
  ])("suffixes %i with %s", (day, suffix) => {
    expect(ordinalSuffix(day)).toBe(suffix)
  })
})

describe("column layouts", () => {
  it("sheds the connection column below 1024", () => {
    expect(hasConnectorColumn("full")).toBe(true)
    expect(hasConnectorColumn("tight")).toBe(true)
    expect(hasConnectorColumn("stacked")).toBe(false)
    expect(hasConnectorColumn("phone")).toBe(false)
  })

  it.each([
    ["account rows", ACCOUNT_ROW_COLUMNS, ACCOUNT_ROW_GAP, ACCOUNT_ROW_PADDING],
    ["holdings rows", HOLDINGS_COLUMNS, HOLDINGS_GAP, HOLDINGS_PADDING],
  ])("never scrolls sideways: %s", (_name, columns, gap, padding) => {
    const layout = resolveColumnLayout(columns, gap, padding)
    for (const width of SHELL_WIDTHS) {
      const required = columnTemplateMinWidth(layout[width].template, {
        gap: layout[width].gap,
        padding: layout[width].padding,
      })
      expect(required).toBeLessThanOrEqual(MAX_TABLE_WIDTH[width])
    }
  })

  it.each(SHELL_WIDTHS)(
    "gives the holdings row one track per cell at the %s width",
    (width) => {
      expect(columnTrackCount(HOLDINGS_COLUMNS[width])).toBe(
        holdingsCellCount(holdingsColumns(width))
      )
    }
  )

  it("sheds the share bar before the gains, and the gains before the value", () => {
    expect(holdingsColumns("tight").showShare).toBe(true)
    expect(holdingsColumns("stacked").showShare).toBe(false)
    expect(holdingsColumns("stacked").showGains).toBe(true)
    expect(holdingsColumns("phone").showGains).toBe(false)
  })

  it("keeps the amount column at every width", () => {
    for (const width of SHELL_WIDTHS) {
      expect(
        ACCOUNT_ROW_COLUMNS[width].split(" ").length
      ).toBeGreaterThanOrEqual(2)
    }
  })
})
