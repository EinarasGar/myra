export interface MockLandingMoney {
  readonly value: number
  readonly currency: string
  readonly locale: string
}

export interface MockLandingUnits {
  readonly value: number | null
  readonly ticker: string | null
}

export interface MockLandingChart {
  readonly points: readonly number[]
  readonly axisLabels: readonly string[]
  readonly periods: readonly string[]
  readonly activePeriod: string
}

export interface MockLandingSnapshot {
  readonly dayLabel: string
  readonly netWorth: MockLandingMoney
  readonly periodDelta: MockLandingMoney
  readonly periodDeltaPercent: number
  readonly periodLabel: string
  readonly saved: MockLandingMoney
  readonly earned: MockLandingMoney
  readonly chart: MockLandingChart
  readonly cash: MockLandingMoney
  readonly cashCurrencies: readonly string[]
  readonly investments: MockLandingMoney
  readonly unrealised: MockLandingMoney
  readonly spentInMonth: MockLandingMoney
  readonly spentChangePercent: number
  readonly needsYou: number
  readonly needsYouNote: string
}

export interface MockLandingEntry {
  readonly label: string
  readonly amount: MockLandingMoney | null
  readonly units: MockLandingUnits | null
}

export interface MockLandingDerivedFigure {
  readonly label: string
  readonly amount: MockLandingMoney
  readonly note: string
}

export interface MockLandingTrade {
  readonly title: string
  readonly meta: string
  readonly dateLabel: string
  readonly entries: readonly MockLandingEntry[]
  readonly derived: readonly MockLandingDerivedFigure[]
}

export interface MockLandingCurrencyRow {
  readonly label: string
  readonly meta: string
  readonly recorded: MockLandingMoney
  readonly converted: MockLandingMoney | null
}

export interface MockLandingCurrencyMonth {
  readonly rows: readonly MockLandingCurrencyRow[]
  readonly net: MockLandingMoney
  readonly currencyCount: number
  readonly surcharge: MockLandingMoney
}

export interface MockLandingLot {
  readonly opened: string
  readonly label: string
  readonly state: "open" | "new" | "closed"
  readonly units: MockLandingUnits
  readonly unitCost: MockLandingMoney | null
  readonly costBasis: MockLandingMoney
  readonly marketValue: MockLandingMoney | null
  readonly unrealised: MockLandingMoney | null
  readonly unrealisedPercent: number | null
  readonly realised: MockLandingMoney | null
}

export interface MockLandingPosition {
  readonly ticker: string
  readonly name: string
  readonly marketValue: MockLandingMoney
  readonly lots: readonly MockLandingLot[]
  readonly totalUnits: MockLandingUnits
  readonly totalCostBasis: MockLandingMoney
  readonly totalMarketValue: MockLandingMoney
  readonly totalUnrealised: MockLandingMoney
  readonly totalUnrealisedPercent: number
  readonly openLots: number
  readonly closedLots: number
  readonly dealingFees: MockLandingMoney
  readonly realisedOnClosedLot: MockLandingMoney
  readonly dividendIncome: MockLandingMoney
}

export interface MockLandingProposal {
  readonly receiptLines: readonly string[]
  readonly merchant: string
  readonly meta: string
  readonly amount: MockLandingMoney
  readonly converted: MockLandingMoney
  readonly rate: number
  readonly entries: readonly MockLandingEntry[]
}

export interface MockLandingLedgerRow {
  readonly label: string
  readonly tag: string | null
  readonly amount: MockLandingMoney
  readonly unreviewed: boolean
}

export interface MockLandingPhoneRow {
  readonly label: string
  readonly meta: string
  readonly amount: MockLandingMoney
  readonly secondary: MockLandingMoney | null
  readonly units: MockLandingUnits | null
}

export interface MockLandingClients {
  readonly monthLabel: string
  readonly filterLabel: string
  readonly net: MockLandingMoney
  readonly out: MockLandingMoney
  readonly in: MockLandingMoney
  readonly dayLabel: string
  readonly dayNet: MockLandingMoney
  readonly rows: readonly MockLandingLedgerRow[]
  readonly phoneClock: string
  readonly phoneNeedsYou: number
  readonly phoneNeedsYouNote: string
  readonly phoneRows: readonly MockLandingPhoneRow[]
}

export const MOCK_LANDING_REFERENCE_CURRENCY = "EUR"

const LOCALES: Record<string, string> = {}

export function mockLandingMoney(
  value: number,
  currency: string = MOCK_LANDING_REFERENCE_CURRENCY
): MockLandingMoney {
  return { value, currency, locale: LOCALES[currency] ?? "en-GB" }
}

export const MOCK_LANDING_SNAPSHOT: MockLandingSnapshot = {
  dayLabel: "Friday 24 July · net worth",
  netWorth: mockLandingMoney(221483.06),
  periodDelta: mockLandingMoney(3142.18),
  periodDeltaPercent: 1.44,
  periodLabel: "over 30 days",
  saved: mockLandingMoney(1180.42),
  earned: mockLandingMoney(1961.76),
  chart: {
    points: [
      196.4, 197.1, 198.6, 198.2, 200.9, 202.1, 200.3, 202.8, 205.1, 206.7,
      205.2, 207.6, 210.1, 209.4, 211.8, 214.6, 213.2, 216.9, 219.4, 218.1,
      220.2, 221.5,
    ],
    axisLabels: ["Aug 25", "Nov 25", "Feb 26", "May 26", "Jul 26"],
    periods: ["1M", "3M", "1Y", "ALL"],
    activePeriod: "1Y",
  },
  cash: mockLandingMoney(18904.11),
  cashCurrencies: ["EUR", "GBP", "USD"],
  investments: mockLandingMoney(96318.72),
  unrealised: mockLandingMoney(11247.08),
  spentInMonth: mockLandingMoney(-2847.19),
  spentChangePercent: -4.1,
  needsYou: 8,
  needsYouNote: "6 imported · 2 drafted by Myra",
}

export const MOCK_LANDING_TRADE: MockLandingTrade = {
  title: "Sell 12 VWCE.DE @ €112.40",
  meta: "Trading 212 · Invest account · fee €1.00",
  dateLabel: "24 Jul 2026",
  entries: [
    {
      label: "Trading 212 · cash",
      amount: mockLandingMoney(1347.8),
      units: null,
    },
    {
      label: "VWCE.DE · units",
      amount: null,
      units: { value: -12, ticker: null },
    },
    {
      label: "Fees & charges · expense",
      amount: mockLandingMoney(1),
      units: null,
    },
  ],
  derived: [
    {
      label: "Account balance",
      amount: mockLandingMoney(3562.4),
      note: "Trading 212 cash, summed from every entry that ever touched it. No stored balance to drift.",
    },
    {
      label: "Realised gain",
      amount: mockLandingMoney(218),
      note: "These 12 units came from your November 2023 purchase, the oldest you still held. Correct that purchase\u2019s fee and this figure re-derives with it.",
    },
    {
      label: "Net worth · 24 Jul",
      amount: mockLandingMoney(221483.06),
      note: "Units became cash at the same price, so only the fee moved the total. One point on the chart, recomputed, not adjusted.",
    },
  ],
}

export const MOCK_LANDING_JULY: MockLandingCurrencyMonth = {
  rows: [
    {
      label: "Salary · Revolut GBP",
      meta: "at 0.8390 GBP/EUR · 01 Jul",
      recorded: mockLandingMoney(3523.8, "GBP"),
      converted: mockLandingMoney(4200),
    },
    {
      label: "Freelance invoice #204 · Wise",
      meta: "at 0.8412 GBP/EUR · 09 Jul",
      recorded: mockLandingMoney(950, "GBP"),
      converted: mockLandingMoney(1129.34),
    },
    {
      label: "Freelance invoice #205 · Wise",
      meta: "at 0.8567 GBP/EUR · 24 Jul",
      recorded: mockLandingMoney(950, "GBP"),
      converted: mockLandingMoney(1108.91),
    },
    {
      label: "Rent & groceries · N26",
      meta: "24 Jul · reference currency",
      recorded: mockLandingMoney(-4257.27),
      converted: null,
    },
    {
      label: "Dividend · VUSA · Trading 212",
      meta: "at 1.0868 USD/EUR · 18 Jul",
      recorded: mockLandingMoney(182.4, "USD"),
      converted: mockLandingMoney(167.83),
    },
  ],
  net: mockLandingMoney(2348.81),
  currencyCount: 144,
  surcharge: mockLandingMoney(0),
}

export const MOCK_LANDING_POSITION: MockLandingPosition = {
  ticker: "VWCE.DE",
  name: "Vanguard FTSE All-World UCITS · accumulating · Trading 212",
  marketValue: mockLandingMoney(4380.31),
  lots: [
    {
      opened: "11 Mar 2024",
      label: "Lot #1 · open",
      state: "open",
      units: { value: 14, ticker: null },
      unitCost: mockLandingMoney(104.82),
      costBasis: mockLandingMoney(1468.48),
      marketValue: mockLandingMoney(1751.84),
      unrealised: mockLandingMoney(283.36),
      unrealisedPercent: 19.3,
      realised: null,
    },
    {
      opened: "02 Sep 2024",
      label: "Lot #2 · open",
      state: "open",
      units: { value: 9, ticker: null },
      unitCost: mockLandingMoney(112.4),
      costBasis: mockLandingMoney(1012.6),
      marketValue: mockLandingMoney(1126.04),
      unrealised: mockLandingMoney(113.44),
      unrealisedPercent: 11.2,
      realised: null,
    },
    {
      opened: "24 Jul 2026",
      label: "Lot #3 · open",
      state: "new",
      units: { value: 12, ticker: null },
      unitCost: mockLandingMoney(112.48),
      costBasis: mockLandingMoney(1349.8),
      marketValue: mockLandingMoney(1502.43),
      unrealised: mockLandingMoney(152.63),
      unrealisedPercent: 11.3,
      realised: null,
    },
    {
      opened: "14 Jun 2025",
      label: "Lot #0 · sold 18 Jan 2026",
      state: "closed",
      units: { value: null, ticker: null },
      unitCost: mockLandingMoney(96.15),
      costBasis: mockLandingMoney(577.9),
      marketValue: null,
      unrealised: null,
      unrealisedPercent: null,
      realised: mockLandingMoney(57.3),
    },
  ],
  totalUnits: { value: 35, ticker: null },
  totalCostBasis: mockLandingMoney(3830.88),
  totalMarketValue: mockLandingMoney(4380.31),
  totalUnrealised: mockLandingMoney(549.43),
  totalUnrealisedPercent: 14.3,
  openLots: 3,
  closedLots: 1,
  dealingFees: mockLandingMoney(4),
  realisedOnClosedLot: mockLandingMoney(57.3),
  dividendIncome: mockLandingMoney(38.12),
}

export const MOCK_LANDING_PROPOSAL: MockLandingProposal = {
  receiptLines: [
    "TESCO EXPRESS",
    "OLD STREET",
    "─────────────",
    "Milk 2 pint    1.35",
    "Sourdough      2.90",
    "Malbec 75cl    9.10",
    "─────────────",
    "TOTAL         13.35",
    "24/07/2026 18:42",
  ],
  merchant: "Tesco Express · Old Street",
  meta: "24 Jul 2026 · 2 transactions · Monzo GBP",
  amount: mockLandingMoney(-13.35, "GBP"),
  converted: mockLandingMoney(-15.87),
  rate: 0.8412,
  entries: [
    {
      label: "Groceries",
      amount: mockLandingMoney(-4.25, "GBP"),
      units: null,
    },
    {
      label: "Alcohol & Bars",
      amount: mockLandingMoney(-9.1, "GBP"),
      units: null,
    },
  ],
}

export const MOCK_LANDING_CLIENTS: MockLandingClients = {
  monthLabel: "Transactions · July 2026",
  filterLabel: "account:all currency:any",
  net: mockLandingMoney(2348.81),
  out: mockLandingMoney(-4257.27),
  in: mockLandingMoney(6606.08),
  dayLabel: "Friday 24 July",
  dayNet: mockLandingMoney(-256.76),
  rows: [
    {
      label: "Trading 212 · Buy 8 VUSA.LSE",
      tag: "Investing",
      amount: mockLandingMoney(-1349.8),
      unreviewed: false,
    },
    {
      label: "Monzo · TESCO EXPRESS",
      tag: null,
      amount: mockLandingMoney(-13.35, "GBP"),
      unreviewed: true,
    },
    {
      label: "Wise · Freelance invoice #205",
      tag: "Income",
      amount: mockLandingMoney(950, "GBP"),
      unreviewed: false,
    },
  ],
  phoneClock: "18:44",
  phoneNeedsYou: 2,
  phoneNeedsYouNote:
    "1 receipt drafted by Myra · 1 imported transaction unreviewed",
  phoneRows: [
    {
      label: "Tesco Express · Old Street",
      meta: "Groceries · today",
      amount: mockLandingMoney(-13.35, "GBP"),
      secondary: mockLandingMoney(-15.87),
      units: null,
    },
    {
      label: "Trading 212 · VUSA.LSE",
      meta: "Investing · today",
      amount: mockLandingMoney(-1349.8),
      secondary: null,
      units: { value: 12, ticker: "units" },
    },
  ],
}
