export type MockProposalRole = "user" | "myra" | "system"

export interface MockProposalMessage {
  readonly key: string
  readonly role: MockProposalRole
  readonly text: string
}

export interface MockProposalField {
  readonly field: string
  readonly previousLabel: string | null
}

export interface MockEditorProposal {
  readonly id: string
  readonly type: string
  readonly intro: string
  readonly accountId: string | null
  readonly assetId: number | null
  readonly categoryId: number | null
  readonly description: string
  readonly amount: number
  readonly filled: readonly MockProposalField[]
  readonly transcript: readonly MockProposalMessage[]
}

export const MOCK_EDITOR_PROPOSAL: MockEditorProposal = {
  id: "mock-editor-proposal",
  type: "regular",
  intro:
    "Myra drafted this from “tesco big shop friday, about forty quid, on the lloyds card”. Nothing is written until you save it.",
  accountId: null,
  assetId: null,
  categoryId: null,
  description: "Tesco",
  amount: 42.18,
  filled: [
    { field: "entry.amount", previousLabel: null },
    { field: "entry.account_id", previousLabel: "Lloyds Current" },
    { field: "category_id", previousLabel: null },
    { field: "description", previousLabel: null },
    { field: "date", previousLabel: null },
  ],
  transcript: [
    {
      key: "m1",
      role: "myra",
      text: "I read “about forty quid” as £42.18 from the Lloyds statement line that matches, and put it under Groceries because that is where your Tesco spending goes.",
    },
    {
      key: "m2",
      role: "user",
      text: "it was the credit card, not the current account",
    },
    {
      key: "m3",
      role: "myra",
      text: "Moved to Lloyds Credit Card. The amount and the date are unchanged.",
    },
    { key: "m4", role: "system", text: "1 field corrected" },
  ],
}

export const MOCK_EDITOR_PROPOSAL_COMPOSER_REFUSAL =
  "Corrections go back to Myra, and a proposal opened outside its conversation has no way to carry one yet. Edit the fields directly instead — every change you make is marked against what Myra proposed."
