import type { FigureIntent } from "@/components/figure"
import type { MockId } from "@/lib/mock"
import type { QuickUploadId, TransactionId } from "@/lib/query"

import type { LedgerTransactionRow, NativeAmount } from "../../api"

export const REVIEW_SOURCES = ["import", "receipt", "proposal"] as const

export type ReviewSource = (typeof REVIEW_SOURCES)[number]

export type ReviewFigure =
  | {
      readonly kind: "native"
      readonly amount: NativeAmount
      readonly intent: FigureIntent
    }
  | {
      readonly kind: "mock"
      readonly value: number
      readonly figureKind: "money" | "units"
      readonly ticker: string | null
      readonly mockId: MockId
    }
  | { readonly kind: "unavailable"; readonly reason: string }

export interface ReviewEntryLine {
  readonly key: string
  readonly name: string
  readonly meta: string
  readonly figure: ReviewFigure
}

export interface ReviewField {
  readonly key: string
  readonly label: string
  readonly value: string
}

export interface ReviewCategory {
  readonly current: string | null
  readonly alternatives: readonly string[]
  readonly note: string
}

export type ReviewRawSource =
  | { readonly available: true; readonly text: string }
  | { readonly available: false; readonly reason: string }

export interface ReviewAction {
  readonly label: string
  readonly blockedReason: string | null
}

export interface ReviewItemActions {
  readonly confirm: ReviewAction
  readonly edit: ReviewAction
  readonly discard: ReviewAction
}

export interface ReviewItem {
  readonly id: string
  readonly source: ReviewSource
  readonly glyph: string
  readonly sourceLabel: string
  readonly arrivedLabel: string
  readonly title: string
  readonly detail: string | null
  readonly rawSource: ReviewRawSource
  readonly figure: ReviewFigure
  readonly fields: readonly ReviewField[]
  readonly category: ReviewCategory
  readonly note: string | null
  readonly entriesTitle: string
  readonly entries: readonly ReviewEntryLine[]
  readonly entriesNote: string
  readonly actions: ReviewItemActions
  readonly queueSourceLabel: string
  readonly queueHint: string
  readonly mockId: MockId | null
  readonly transactionId: TransactionId | null
  readonly quickUploadId: QuickUploadId | null
  readonly row: LedgerTransactionRow | null
}

export interface ReviewQueueView {
  readonly items: readonly ReviewItem[]
  readonly count: number
  readonly countIsLowerBound: boolean
  readonly sourceCounts: Record<ReviewSource, number>
  readonly summary: string
  readonly mockIds: readonly MockId[]
  readonly receiptsUnavailable: boolean
  readonly receiptsWorking: number
  readonly receiptsFailed: number
}
