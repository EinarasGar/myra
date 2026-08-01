import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { createSeriesColors } from "@/components/chart"
import { SHELL_WIDTHS, type ShellWidth } from "@/components/layout/breakpoints"
import { AccountGroup } from "@/features/accounts/account-group"
import { AccountHoldings } from "@/features/accounts/account-holdings"
import {
  renderAssets,
  stubViewport as stubAssetsViewport,
} from "@/features/assets/test-harness"
import { ValuationHistory } from "@/features/assets/valuation-history"
import type {
  AccountIndexGroup,
  AccountIndexRow,
} from "@/features/accounts/rows"
import {
  renderAccounts,
  stubViewport as stubAccountsViewport,
} from "@/features/accounts/test-harness"
import type { RecentDay } from "@/features/dashboard/api"
import { RecentPanelView } from "@/features/dashboard/components/recent-panel"
import {
  groupRowsByDay,
  toLedgerRows,
  toLookupIndex,
} from "@/features/transactions/api"
import {
  accountFees,
  cashDividend,
  ghostTransfer,
  groupItem,
  individualItem,
  lookupTables,
  regular,
} from "@/features/transactions/api/fixtures"
import { LedgerTable } from "@/features/transactions/explore/ledger-table"
import { pivotRows } from "@/features/transactions/explore/pivot"
import {
  ledgerBanding,
  ledgerColumns,
} from "@/features/transactions/explore/presentation"
import {
  renderExplore,
  stubViewport,
  VIEWPORTS,
} from "@/features/transactions/explore/test-harness"
import { buildReviewQueue } from "@/features/transactions/review/api"
import { ReviewQueueList } from "@/features/transactions/review/review-queue-list"
import type {
  AssetHolding,
  PortfolioOverviewView,
} from "@/features/portfolio/api"
import {
  assetOverviewFixture,
  holdingsFixture,
  overviewFixture,
  VWRP,
} from "@/features/portfolio/fixtures"
import {
  buildHoldingRows,
  buildLotRows,
  buildLotTotals,
  buildPeriodColumn,
  HOLDINGS_ROWS_DRAWN,
  LOT_ROWS_DRAWN,
  summariseHoldings,
} from "@/features/portfolio"
import { HoldingsTable } from "@/features/portfolio/holdings-table"
import { LotsTable } from "@/features/portfolio/lots-table"
import {
  renderPortfolio,
  stubViewport as stubPortfolioViewport,
} from "@/features/portfolio/test-harness"

import { columnTrackCount } from "./table-columns"

function ledgerRows() {
  return toLedgerRows(
    [
      individualItem(regular()),
      individualItem(cashDividend()),
      individualItem(accountFees()),
      individualItem(ghostTransfer()),
      groupItem([regular({ transaction_id: "tx-a" }), accountFees()]),
    ],
    toLookupIndex(lookupTables)
  )
}

function recentDays(): RecentDay[] {
  return [...groupRowsByDay(ledgerRows())].map((day) => ({
    ...day,
    hiddenCount: 0,
  }))
}

function accountRow(overrides: Partial<AccountIndexRow> = {}): AccountIndexRow {
  return {
    accountId: "a1",
    name: "Lloyds Current",
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
    value: 4183.06,
    ratelessCount: 0,
    hasHoldings: true,
    connector: {
      bindingId: "b1",
      connectionId: "c1",
      accountId: "a1",
      providerAccountId: "pa1",
      status: "active",
      statusWord: "active",
      createdAt: 0,
      lastSyncAt: null,
      lastSyncFailed: false,
      lastSyncError: null,
      syncedThrough: null,
      writesPostDirectly: false,
    },
    unrealisedGains: 1447.2,
    ...overrides,
  }
}

const ACCOUNT_GROUP: AccountIndexGroup = {
  accountClass: "cash",
  label: "Cash",
  swatch: "bg-chart-1",
  accounts: [
    accountRow(),
    accountRow({
      accountId: "a2",
      name: "Joint Bills",
      isJoint: true,
      ownershipShare: 0.5,
      ownershipSharePercent: 50,
      connector: null,
      unrealisedGains: null,
    }),
  ],
  subtotal: 24227.24,
  ratelessCount: 1,
}

function holding(overrides: Partial<AssetHolding> = {}): AssetHolding {
  return {
    assetId: 7,
    asset: {
      assetId: 7,
      ticker: "VUSA",
      name: "Vanguard S&P 500",
      assetTypeId: 3,
    },
    positions: [],
    accountCount: 1,
    unitsRemaining: 12.5,
    marketValue: 9240.5,
    totalCostBasis: 8000,
    averageUnitCost: 640,
    realisedGains: 0,
    unrealisedGains: 1240.5,
    totalGains: 1240.5,
    totalFees: 0,
    cashDividends: 0,
    returnRatio: 0.1551,
    heldSince: null,
    allocationShare: null,
    lots: [],
    fifoScope: "per-account",
    ...overrides,
  }
}

const HOLDINGS_OVERVIEW: PortfolioOverviewView = {
  scope: { kind: "account", accountId: "a1" },
  assets: [
    holding(),
    holding({
      assetId: 9,
      asset: {
        assetId: 9,
        ticker: "AGGU",
        name: "Global Bond",
        assetTypeId: 3,
      },
      unitsRemaining: 300,
      marketValue: 3080.25,
      totalGains: -120.4,
      unrealisedGains: -120.4,
      returnRatio: -0.0376,
    }),
  ],
  assetsById: {},
  positions: [],
  cash: [],
  totals: {
    marketValue: 12320.75,
    totalCostBasis: 8000,
    realisedGains: 0,
    unrealisedGains: 1120.1,
    totalGains: 1120.1,
    totalFees: 0,
    cashDividends: 0,
    returnRatio: 0.1551,
  },
  assetCount: 2,
  accountCount: 1,
  largestAllocationShare: null,
  appliesOwnershipShare: false,
  fifoScope: "per-account",
  isLifetimeOnly: true,
  lookups: { assetsById: {}, accountsById: {} },
}

function reviewItems() {
  const rows = toLedgerRows(
    Array.from({ length: 7 }, (_, index) =>
      individualItem({
        ...ghostTransfer(),
        transaction_id: `tx-ghost-${String(index)}`,
      })
    ),
    toLookupIndex(lookupTables)
  )
  return buildReviewQueue({
    rows,
    uploads: [],
    receiptsUnavailable: true,
    hasMoreLedger: true,
    includeProposals: false,
    now: new Date(0),
  }).items
}

type Sweep = {
  readonly file: string
  readonly cases: Readonly<Record<string, (width: ShellWidth) => Promise<void>>>
}

const EXPANDED_GROUPS: ReadonlySet<string> = new Set(["group-1"])

async function renderLedger(width: ShellWidth, mode: "day" | "category") {
  stubViewport(VIEWPORTS[width])
  const rows = ledgerRows()
  await renderExplore(
    <LedgerTable
      pivot={pivotRows(rows, mode)}
      columns={ledgerColumns(width, ledgerBanding(mode))}
      selection={{
        ids: new Set<string>(),
        isSelected: () => false,
        toggle: () => {},
        setMany: () => {},
        clear: () => {},
      }}
      categoryName={(category) => category.name}
      onMarkReviewed={() => {}}
      onOpenTransaction={() => {}}
      expanded={EXPANDED_GROUPS}
      onToggleExpanded={() => {}}
      loadedCount={rows.length}
      totalResults={412}
      hasNextPage
      isFetchingNextPage={false}
      onLoadMore={() => {}}
    />
  )
}

const VALUATIONS = [
  { date: new Date("2026-07-01T00:00:00Z"), rate: 164000 },
  { date: new Date("2026-04-01T00:00:00Z"), rate: 158000 },
]

const SWEEPS: readonly Sweep[] = [
  {
    file: "/src/features/assets/valuation-history.tsx",
    cases: {
      "valuation history": async (width) => {
        stubAssetsViewport(VIEWPORTS[width])
        await renderAssets(
          <ValuationHistory
            assetId={40}
            referenceId={45}
            referenceTicker="GBP"
            rates={VALUATIONS}
            hasPeriodControl
            onAdd={() => undefined}
          />
        )
      },
    },
  },
  {
    file: "/src/features/accounts/account-group.tsx",
    cases: {
      "account group": async (width) => {
        stubAccountsViewport(VIEWPORTS[width])
        await renderAccounts(<AccountGroup group={ACCOUNT_GROUP} />)
      },
    },
  },
  {
    file: "/src/features/accounts/account-holdings.tsx",
    cases: {
      holdings: async (width) => {
        stubAccountsViewport(VIEWPORTS[width])
        await renderAccounts(<AccountHoldings overview={HOLDINGS_OVERVIEW} />)
      },
    },
  },
  {
    file: "/src/features/dashboard/components/recent-panel.tsx",
    cases: {
      "recent panel": async (width) => {
        stubViewport(VIEWPORTS[width])
        const days = recentDays()
        const shownCount = days.reduce((sum, day) => sum + day.rows.length, 0)
        await renderExplore(
          <RecentPanelView
            days={days}
            totalResults={412}
            shownCount={shownCount}
            hiddenCount={0}
            width={width}
            onOpen={() => {}}
          />
        )
      },
    },
  },
  {
    file: "/src/features/transactions/explore/ledger-table.tsx",
    cases: {
      "day banding": (width) => renderLedger(width, "day"),
      "pivot banding": (width) => renderLedger(width, "category"),
    },
  },
  {
    file: "/src/features/portfolio/holdings-table.tsx",
    cases: {
      "portfolio holdings": async (width) => {
        stubPortfolioViewport(VIEWPORTS[width])
        const holdings = holdingsFixture()
        const overview = overviewFixture()
        const rows = buildHoldingRows(holdings, overview)
        await renderPortfolio(
          <HoldingsTable
            summary={summariseHoldings(rows, holdings, overview)}
            period={buildPeriodColumn(rows, "1m", 1318.9)}
            colors={createSeriesColors(rows.map((row) => row.key))}
            currency="GBP"
            expanded={new Set(rows.map((row) => row.key))}
            onToggle={() => {}}
            shown={HOLDINGS_ROWS_DRAWN}
            onShowAll={() => {}}
          />
        )
      },
    },
  },
  {
    file: "/src/features/portfolio/lots-table.tsx",
    cases: {
      "purchase lots": async (width) => {
        stubPortfolioViewport(VIEWPORTS[width])
        const overview = assetOverviewFixture()
        const holding = overview.assetsById[VWRP]
        if (holding === undefined) throw new Error("fixture has no holding")
        await renderPortfolio(
          <LotsTable
            rows={buildLotRows(holding, overview)}
            totals={buildLotTotals(holding)}
            currency="GBP"
            ticker="VWRP.LSE"
            shown={LOT_ROWS_DRAWN}
            onShowAll={() => {}}
          />
        )
      },
    },
  },
  {
    file: "/src/features/transactions/review/review-queue-list.tsx",
    cases: {
      "review queue": async (width) => {
        stubViewport(VIEWPORTS[width])
        await renderExplore(
          <ReviewQueueList
            items={reviewItems()}
            onSelect={() => {}}
            onShowAll={() => {}}
          />
        )
      },
    },
  },
]

function callSites(): string[] {
  const sources = import.meta.glob<string>("/src/**/*.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  })
  return Object.entries(sources)
    .filter(([path]) => !path.endsWith(".test.tsx"))
    .filter(([, source]) => source.includes("<DataTable"))
    .map(([path]) => path)
    .sort((left, right) => left.localeCompare(right))
}

function auditRenderedTables(): { grid: number; spanning: number } {
  const tables = document.querySelectorAll<HTMLTableElement>(
    '[data-slot="data-table"]'
  )
  expect(tables.length).toBeGreaterThan(0)

  let grid = 0
  let spanning = 0
  for (const table of tables) {
    const tracks = columnTrackCount(table.style.getPropertyValue("--dt-cols"))
    for (const row of table.querySelectorAll("tr")) {
      const spanned = row.querySelector("[aria-colspan]")
      if (spanned !== null) {
        expect(Number(spanned.getAttribute("aria-colspan"))).toBe(tracks)
        expect(row.childElementCount).toBe(1)
        spanning += 1
        continue
      }
      expect(row.childElementCount).toBe(tracks)
      grid += 1
    }
  }
  return { grid, spanning }
}

afterEach(() => {
  cleanup()
})

describe("every DataTable in the app", () => {
  it("is swept at every shell width by this file", () => {
    expect(
      callSites(),
      "A DataTable is only checked at the widths something renders it at. Add the new table to SWEEPS here — mount it with the least data that fills a row — so its cell count is held against its template at all four widths."
    ).toEqual(
      [...SWEEPS].map((sweep) => sweep.file).sort((a, b) => a.localeCompare(b))
    )
  })

  for (const sweep of SWEEPS) {
    for (const [name, mount] of Object.entries(sweep.cases)) {
      describe(`${sweep.file} — ${name}`, () => {
        it.each(SHELL_WIDTHS)(
          "emits one cell per track, and spans the whole grid where it spans, at %s",
          async (width) => {
            await mount(width)
            expect(auditRenderedTables().grid).toBeGreaterThan(0)
          }
        )
      })
    }
  }

  it("puts a spanning row under the same contract", async () => {
    const ledger = SWEEPS.find((sweep) =>
      sweep.file.endsWith("ledger-table.tsx")
    )
    expect(ledger).toBeDefined()
    await ledger?.cases["day banding"]?.("full")
    expect(auditRenderedTables().spanning).toBeGreaterThan(0)
  })
})
