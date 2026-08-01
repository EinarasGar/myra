import { MOCK_LEDGER, mockRound } from "./ledger"

export interface MockProposalEntry {
  readonly key: string
  readonly asset: string
  readonly meta: string
  readonly amount: number
  readonly kind: "money" | "units"
}

export interface MockReviewProposal {
  readonly id: string
  readonly title: string
  readonly prompt: string
  readonly amount: number
  readonly typeName: string
  readonly accountName: string
  readonly categoryName: string
  readonly alternativeCategories: readonly string[]
  readonly conversationLabel: string
  readonly note: string
  readonly draftedAt: string
  readonly entries: readonly MockProposalEntry[]
  readonly netEffect: number
  readonly netEffectNote: string
}

const DRAFTED_AT = MOCK_LEDGER.asOf

export const MOCK_REVIEW_PROPOSALS: readonly MockReviewProposal[] = [
  {
    id: "mock-proposal-vwrp",
    title: "Buy VWRP.LSE · 2 units",
    prompt: "add my three trading 212 buys from friday — 2 VWCE at 100…",
    amount: mockRound(-201),
    typeName: "Buy asset · 3 entries",
    accountName: "Trading 212 ISA",
    categoryName: "Investments → ETFs",
    alternativeCategories: ["Investments → Stocks"],
    conversationLabel: "same conversation",
    note: "You wrote VWCE; I matched it to VWRP.LSE, the accumulating class you already hold 46 units of. Approving writes the transaction — denying leaves nothing behind.",
    draftedAt: DRAFTED_AT,
    entries: [
      {
        key: "vwrp",
        asset: "VWRP.LSE",
        meta: "Trading 212 ISA · Investments → ETFs",
        amount: 2,
        kind: "units",
      },
      {
        key: "cash",
        asset: "GBP",
        meta: "Trading 212 ISA · Investments → ETFs",
        amount: mockRound(-200),
        kind: "money",
      },
      {
        key: "fee",
        asset: "GBP",
        meta: "Trading 212 ISA · Brokerage fees",
        amount: mockRound(-1),
        kind: "money",
      },
    ],
    netEffect: mockRound(-1),
    netEffectNote:
      "the fee. The rest changed form, not value — cash became units.",
  },
  {
    id: "mock-proposal-vusa",
    title: "Buy VUSA.LSE · 4 units",
    prompt: "add my three trading 212 buys from friday — 4 VUSA at 84.35…",
    amount: mockRound(-337.4),
    typeName: "Buy asset · 2 entries",
    accountName: "Trading 212 ISA",
    categoryName: "Investments → ETFs",
    alternativeCategories: ["Investments → Stocks"],
    conversationLabel: "same conversation",
    note: "Same conversation as the VWRP.LSE buy. No fee was mentioned, so none is written.",
    draftedAt: DRAFTED_AT,
    entries: [
      {
        key: "vusa",
        asset: "VUSA.LSE",
        meta: "Trading 212 ISA · Investments → ETFs",
        amount: 4,
        kind: "units",
      },
      {
        key: "cash",
        asset: "GBP",
        meta: "Trading 212 ISA · Investments → ETFs",
        amount: mockRound(-337.4),
        kind: "money",
      },
    ],
    netEffect: 0,
    netEffectNote: "nothing. Cash became units of the same value.",
  },
  {
    id: "mock-proposal-btc",
    title: "Buy BTC · 0.0100",
    prompt: "and 0.01 btc on coinbase the same day",
    amount: mockRound(-669),
    typeName: "Buy asset · 2 entries",
    accountName: "Coinbase",
    categoryName: "Investments → Crypto",
    alternativeCategories: ["Investments → Stocks"],
    conversationLabel: "same conversation",
    note: "Coinbase was inferred from the account you last used for BTC. Change it in the editor if that is wrong.",
    draftedAt: DRAFTED_AT,
    entries: [
      {
        key: "btc",
        asset: "BTC",
        meta: "Coinbase · Investments → Crypto",
        amount: 0.01,
        kind: "units",
      },
      {
        key: "cash",
        asset: "GBP",
        meta: "Coinbase · Investments → Crypto",
        amount: mockRound(-669),
        kind: "money",
      },
    ],
    netEffect: 0,
    netEffectNote: "nothing. Cash became units of the same value.",
  },
]

export const MOCK_REVIEW_PROPOSAL_SOURCE = "Proposed by Myra · from chat"
