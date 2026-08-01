import type { IdentifiableQuickUploadResponse } from "@/api"
import { countOf, formatDateStamp, formatDateTimeStamp } from "@/lib/format"
import type { MockId } from "@/lib/mock"
import { accountLabel } from "@/lib/domain/refs"

import type { LedgerRow, LedgerTransactionRow } from "../../api"
import { isGroupRow } from "../../api"
import { buildProposalItems } from "./proposals"
import {
  isReceiptFailed,
  isReceiptReady,
  isReceiptWorking,
} from "./quick-uploads"
import type {
  ReviewEntryLine,
  ReviewItem,
  ReviewQueueView,
  ReviewSource,
} from "./types"

export const NO_PROVENANCE_REASON =
  "The original line from the bank is not kept, so there is nothing to compare this description with."

export const GHOST_ENTRIES_NOTE =
  "These entries are already in your ledger. An unreviewed import counts towards balances and net worth before you confirm it — confirming records that you have read it, it does not add it."

const RECEIPT_NO_AMOUNT =
  "A receipt draft carries no asset, so there is nothing to state an amount in until you file it."

const RECEIPT_NO_PROPOSAL =
  "This receipt is marked ready but came back with no proposal attached."

const RECEIPT_UNREADABLE =
  "Myra returned a draft this screen cannot display. Open the detail to see it before you file it."

interface ReceiptDraft {
  readonly description: string | null
  readonly date: Date | null
  readonly hasAmount: boolean
}

function textOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}

function readReceiptDraft(data: unknown): ReceiptDraft | null {
  if (typeof data !== "object" || data === null) return null
  const record = data as Record<string, unknown>
  const stamp = textOf(record["date"])
  const parsed = stamp === null ? null : new Date(stamp)
  const draft: ReceiptDraft = {
    description: textOf(record["description"]),
    date: parsed !== null && !Number.isNaN(parsed.getTime()) ? parsed : null,
    hasAmount: textOf(record["amount"]) !== null,
  }
  if (draft.description === null && draft.date === null && !draft.hasAmount) {
    return null
  }
  return draft
}

function receiptSummary(draft: ReceiptDraft, now: Date): string {
  const dated =
    draft.date === null
      ? ""
      : ` dated ${formatDateStamp(draft.date, { year: "always", now })}`
  return `Myra read this receipt and drafted one transaction${dated}. Filing it writes that draft to your ledger; nothing is there yet.`
}

const EDITOR_PENDING =
  "Editing a receipt draft is not built yet. The detail shows everything Sverto read from it."

export function unreviewedTransactions(
  rows: readonly LedgerRow[]
): LedgerTransactionRow[] {
  const found: LedgerTransactionRow[] = []
  for (const row of rows) {
    if (isGroupRow(row)) {
      for (const child of row.children) {
        if (child.isUnreviewed) found.push(child)
      }
      continue
    }
    if (row.isUnreviewed) found.push(row)
  }
  return found
}

function entryLines(row: LedgerTransactionRow): ReviewEntryLine[] {
  const legs: ReviewEntryLine[] = row.legs.map((leg) => ({
    key: `leg-${String(leg.entryId)}`,
    name: leg.amount.asset.ticker ?? leg.amount.asset.name ?? leg.label,
    meta: `${accountLabel(leg.account)} · ${leg.label}`,
    figure: { kind: "native", amount: leg.amount, intent: "neutral" },
  }))
  const fees: ReviewEntryLine[] = row.fees.map((fee) => ({
    key: `fee-${String(fee.entryId)}`,
    name: fee.amount.asset.ticker ?? fee.amount.asset.name ?? "Fee",
    meta: `${accountLabel(fee.account)} · ${fee.feeType.replace("_", " ")} fee`,
    figure: { kind: "native", amount: fee.amount, intent: "neutral" },
  }))
  return [...legs, ...fees]
}

function accountsField(row: LedgerTransactionRow): string {
  if (row.accounts.length === 0) return "—"
  if (row.accounts.length === 1) return accountLabel(row.accounts[0]!)
  return row.accounts.map((account) => accountLabel(account)).join(" → ")
}

export function buildImportItem(
  row: LedgerTransactionRow,
  now: Date
): ReviewItem {
  const entries = entryLines(row)
  return {
    id: `import:${row.transactionId}`,
    source: "import",
    glyph: "◌",
    sourceLabel: "Unreviewed in your ledger",
    arrivedLabel: `dated ${formatDateStamp(row.date, { now, year: "always" })}`,
    title: row.description.primary,
    detail: row.description.detail,
    rawSource: { available: false, reason: NO_PROVENANCE_REASON },
    figure:
      row.primaryAmount === null
        ? { kind: "unavailable", reason: "This transaction has no entries." }
        : {
            kind: "native",
            amount: row.primaryAmount,
            intent: row.figureIntent,
          },
    fields: [
      {
        key: "date",
        label: "Date",
        value: formatDateStamp(row.date, { now, year: "always" }),
      },
      { key: "account", label: "Account", value: accountsField(row) },
      {
        key: "type",
        label: "Type",
        value: `${row.typeName} · ${countOf(entries.length, "entry", "entries")}`,
      },
    ],
    category: {
      current: row.category?.name ?? null,
      alternatives: [],
      note: row.categorySupported
        ? "Only this transaction's own category is known — nothing suggests alternatives."
        : `${row.typeName} carries no category. The type and the entries say what happened.`,
    },
    note: null,
    entriesTitle: "Entries it already wrote",
    entries,
    entriesNote: GHOST_ENTRIES_NOTE,
    actions: {
      confirm: { label: "Mark reviewed", blockedReason: null },
      edit: { label: "Open detail", blockedReason: null },
      discard: { label: "Delete", blockedReason: null },
    },
    queueSourceLabel: "Unreviewed import",
    queueHint: row.category?.name ?? row.typeName,
    mockId: null,
    transactionId: row.transactionId,
    quickUploadId: null,
    row,
  }
}

export function buildReceiptItem(
  upload: IdentifiableQuickUploadResponse,
  now: Date
): ReviewItem {
  const draft =
    upload.proposal_data === undefined || upload.proposal_data === null
      ? null
      : readReceiptDraft(upload.proposal_data)
  const missing =
    upload.proposal_data === undefined || upload.proposal_data === null
  return {
    id: `receipt:${upload.id}`,
    source: "receipt",
    glyph: "◆",
    sourceLabel: "Quick upload · read by Myra",
    arrivedLabel: `uploaded ${formatDateTimeStamp(upload.created_at, { now })}`,
    title: draft?.description ?? "Receipt read by Myra",
    detail: draft?.description === undefined ? null : "Draft from a receipt",
    rawSource:
      draft === null
        ? {
            available: false,
            reason: missing ? RECEIPT_NO_PROPOSAL : RECEIPT_UNREADABLE,
          }
        : { available: true, text: receiptSummary(draft, now) },
    figure: { kind: "unavailable", reason: RECEIPT_NO_AMOUNT },
    fields: [
      {
        key: "uploaded",
        label: "Uploaded",
        value: formatDateTimeStamp(upload.created_at, { now }),
      },
      {
        key: "dated",
        label: "Dated",
        value:
          draft?.date === null || draft?.date === undefined
            ? "Not read from the receipt"
            : formatDateStamp(draft.date, { year: "always", now }),
      },
      {
        key: "amount",
        label: "Amount",
        value:
          draft?.hasAmount === true
            ? "Read from the receipt"
            : "Not read from the receipt",
      },
    ],
    category: {
      current: null,
      alternatives: [],
      note: "A receipt has no category until its proposal is filed.",
    },
    note: null,
    entriesTitle: "Entries it will write",
    entries: [],
    entriesNote:
      "Nothing is written yet. Filing this receipt writes whatever the proposal on the left describes; discarding it leaves nothing behind.",
    actions: {
      confirm: { label: "File it", blockedReason: null },
      edit: { label: "Open detail", blockedReason: EDITOR_PENDING },
      discard: { label: "Discard", blockedReason: null },
    },
    queueSourceLabel: "Quick upload",
    queueHint: "read by Myra · ready",
    mockId: null,
    transactionId: null,
    quickUploadId: upload.id,
    row: null,
  }
}

export function queueSummary(counts: Record<ReviewSource, number>): string {
  const parts: string[] = []
  if (counts.proposal > 0) {
    parts.push(countOf(counts.proposal, "Myra proposal"))
  }
  if (counts.import > 0) {
    parts.push(countOf(counts.import, "unreviewed import"))
  }
  if (counts.receipt > 0) {
    parts.push(countOf(counts.receipt, "receipt"))
  }
  if (parts.length === 0) return "Nothing is waiting on you."
  const last = parts.pop() as string
  const list = parts.length === 0 ? last : `${parts.join(", ")} and ${last}`
  return `${list} — everything waiting on you, in one queue.`
}

export interface ReviewQueueInput {
  readonly rows: readonly LedgerRow[]
  readonly uploads: readonly IdentifiableQuickUploadResponse[]
  readonly receiptsUnavailable: boolean
  readonly hasMoreLedger: boolean
  readonly includeProposals: boolean
  readonly now: Date
}

export function buildReviewQueue(input: ReviewQueueInput): ReviewQueueView {
  const imports = unreviewedTransactions(input.rows).map((row) =>
    buildImportItem(row, input.now)
  )
  const receipts = input.uploads
    .filter(isReceiptReady)
    .map((upload) => buildReceiptItem(upload, input.now))
  const proposals = input.includeProposals ? buildProposalItems(input.now) : []

  const items = [...imports, ...receipts, ...proposals]
  const sourceCounts: Record<ReviewSource, number> = {
    import: imports.length,
    receipt: receipts.length,
    proposal: proposals.length,
  }

  const mockIds = [
    ...new Set(
      items.map((item) => item.mockId).filter((id): id is MockId => id !== null)
    ),
  ]

  return {
    items,
    count: items.length,
    countIsLowerBound: input.hasMoreLedger,
    sourceCounts,
    summary: queueSummary(sourceCounts),
    mockIds,
    receiptsUnavailable: input.receiptsUnavailable,
    receiptsWorking: input.uploads.filter(isReceiptWorking).length,
    receiptsFailed: input.uploads.filter(isReceiptFailed).length,
  }
}
