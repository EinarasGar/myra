import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type {
  CashPosition,
  PortfolioOverviewView,
} from "@/features/portfolio/api"

import { AccountTiles } from "./account-tiles"
import type { AccountDetail } from "./api"
import { renderAccounts } from "./test-harness"

function account(overrides: Partial<AccountDetail> = {}): AccountDetail {
  return {
    accountId: "a1",
    name: "Cash Wallet",
    accountTypeId: 11,
    accountTypeName: "Cash",
    accountClass: "cash",
    isLiquid: true,
    isLiability: false,
    liquidityTypeId: 1,
    liquidityTypeName: "Liquid",
    ownershipShare: 1,
    ownershipSharePercent: 100,
    isJoint: false,
    identifiers: [],
    ...overrides,
  }
}

function overview(
  overrides: Partial<PortfolioOverviewView> = {}
): PortfolioOverviewView {
  return {
    positions: [],
    assets: [],
    cash: [],
    assetCount: 0,
    totals: {
      marketValue: 0,
      totalCostBasis: 0,
      realisedGains: 0,
      unrealisedGains: 0,
      totalGains: 0,
      totalFees: 0,
      cashDividends: 0,
      returnRatio: null,
    },
    ...overrides,
  } as unknown as PortfolioOverviewView
}

function cash(assetTypeId: number | null, ticker: string): CashPosition {
  return {
    assetId: 5,
    accountId: "a1",
    asset: { assetId: 5, ticker, name: ticker, assetTypeId },
    account: null,
    units: 1841.6,
    fees: 0,
    dividends: 0,
  }
}

describe("AccountTiles — liabilities", () => {
  const mortgage = account({
    name: "Halifax Mortgage",
    accountClass: "liabilities",
    isLiability: true,
    isLiquid: false,
    accountTypeName: "Mortgage",
  })

  it("labels the figure as debt and keeps its own minus sign", async () => {
    await renderAccounts(
      <AccountTiles
        account={mortgage}
        overview={overview()}
        balance={-142880}
      />
    )
    expect(screen.getByText("Balance owed")).toBeInTheDocument()
    expect(screen.getByText("−£142,880.00")).toBeInTheDocument()
  })

  it("marks every invented lending term and never the balance", async () => {
    const { container } = await renderAccounts(
      <AccountTiles
        account={mortgage}
        overview={overview()}
        balance={-142880}
      />
    )
    const marked = [...container.querySelectorAll("[data-mock]")]
    expect(marked.length).toBeGreaterThan(0)
    for (const node of marked) {
      expect(node.getAttribute("data-mock")).toBe("accounts.financial-metadata")
    }
    expect(screen.getByText("Balance owed").closest("[data-mock]")).toBeNull()
  })

  it("drops the terms entirely for a liability the mock knows nothing about", async () => {
    await renderAccounts(
      <AccountTiles
        account={account({
          name: "Bank of Mum",
          accountClass: "liabilities",
          isLiability: true,
        })}
        overview={overview()}
        balance={-500}
      />
    )
    expect(screen.queryByText("Interest rate")).toBeNull()
    expect(screen.getByText(/have nowhere to live yet/)).toBeInTheDocument()
  })
})

describe("AccountTiles — cash", () => {
  it("renders a currency cash balance in its own currency, not the base one", async () => {
    await renderAccounts(
      <AccountTiles
        account={account()}
        overview={overview({ cash: [cash(1, "USD")] })}
        balance={1400}
      />
    )
    expect(screen.getByText("$1,841.60")).toBeInTheDocument()
  })

  it("renders a non-currency cash row as units rather than money", async () => {
    await renderAccounts(
      <AccountTiles
        account={account()}
        overview={overview({ cash: [cash(null, "VUSA")] })}
        balance={1400}
      />
    )
    expect(screen.getByText(/1,841\.6/)).toHaveTextContent("VUSA")
  })
})

describe("AccountTiles — investments", () => {
  it("separates the converted balance from the lifetime investment figures", async () => {
    await renderAccounts(
      <AccountTiles
        account={account({
          name: "Trading 212 ISA",
          accountClass: "investments",
          accountTypeName: "Investment",
          isLiquid: false,
        })}
        overview={overview({
          positions: [{}] as unknown as PortfolioOverviewView["positions"],
          assetCount: 2,
          totals: {
            marketValue: 12392.8,
            totalCostBasis: 11180.6,
            realisedGains: 0,
            unrealisedGains: 1212.2,
            totalGains: 1212.2,
            totalFees: 11,
            cashDividends: 0,
            returnRatio: 0.1084,
          },
        })}
        balance={14234.4}
      />
    )
    expect(screen.getByText("Account value")).toBeInTheDocument()
    expect(screen.getByText("£14,234.40")).toBeInTheDocument()
    expect(screen.getByText("£11,180.60")).toBeInTheDocument()
    expect(screen.getByText("+£1,212.20")).toBeInTheDocument()
    expect(screen.getByText("2 assets")).toBeInTheDocument()
    expect(
      screen.getByText(/whole account rather than your share/)
    ).toBeInTheDocument()
  })
})
