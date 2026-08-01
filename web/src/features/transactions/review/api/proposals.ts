import type { MockId } from "@/lib/mock"
import { MOCK_REVIEW_PROPOSALS, MOCK_REVIEW_PROPOSAL_SOURCE } from "@/lib/mock"
import { formatDateTimeStamp } from "@/lib/format"

import type { ReviewEntryLine, ReviewItem } from "./types"

export const PROPOSALS_MOCK_ID: MockId = "transactions.review-proposals"

const CANNOT_WRITE =
  "A Myra proposal can only be approved, edited or denied inside its own conversation for now. Open the conversation in Myra to act on it."

function proposalEntries(
  entries: (typeof MOCK_REVIEW_PROPOSALS)[number]["entries"]
): ReviewEntryLine[] {
  return entries.map((entry) => ({
    key: entry.key,
    name: entry.asset,
    meta: entry.meta,
    figure: {
      kind: "mock",
      value: entry.amount,
      figureKind: entry.kind,
      ticker: entry.kind === "units" ? entry.asset : null,
      mockId: PROPOSALS_MOCK_ID,
    },
  }))
}

export function buildProposalItems(now: Date): ReviewItem[] {
  return MOCK_REVIEW_PROPOSALS.map((proposal) => ({
    id: proposal.id,
    source: "proposal" as const,
    glyph: "✦",
    sourceLabel: MOCK_REVIEW_PROPOSAL_SOURCE,
    arrivedLabel: `drafted ${formatDateTimeStamp(proposal.draftedAt, { now })}`,
    title: proposal.title,
    detail: null,
    rawSource: { available: true, text: `“${proposal.prompt}”` },
    figure: {
      kind: "mock",
      value: proposal.amount,
      figureKind: "money",
      ticker: null,
      mockId: PROPOSALS_MOCK_ID,
    },
    fields: [
      { key: "date", label: "Date", value: proposal.conversationLabel },
      { key: "account", label: "Account", value: proposal.accountName },
      { key: "type", label: "Type", value: proposal.typeName },
    ],
    category: {
      current: proposal.categoryName,
      alternatives: proposal.alternativeCategories,
      note: "Suggested by Myra. Nothing is filed until the proposal is approved.",
    },
    note: proposal.note,
    entriesTitle: "Entries it would write",
    entries: proposalEntries(proposal.entries),
    entriesNote: `Net effect on net worth would be ${proposal.netEffectNote}`,
    actions: {
      confirm: { label: "Confirm", blockedReason: CANNOT_WRITE },
      edit: { label: "Open editor", blockedReason: CANNOT_WRITE },
      discard: { label: "Deny", blockedReason: CANNOT_WRITE },
    },
    queueSourceLabel: "Myra proposal",
    queueHint: proposal.conversationLabel,
    mockId: PROPOSALS_MOCK_ID,
    transactionId: null,
    quickUploadId: null,
    row: null,
  }))
}
