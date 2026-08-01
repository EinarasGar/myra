import type { ShellWidth } from "@/components/layout/breakpoints"
import type {
  AnyTransactionTypeConfig,
  TransactionRuleKind,
  TransactionTypeTag,
} from "@/lib/domain/transaction-types"
import {
  impliedUnitPrice,
  TRANSACTION_TYPE_CONFIG,
} from "@/lib/domain/transaction-types"

import type { EditorDraft, EditorSlotKey, EditorSlotShape } from "./draft"
import {
  magnitudeOf,
  signedAmountOf,
  slotKeyOfField,
  slotShapes,
} from "./draft"

export type EditorLayout = "single" | "dual"

export const EDITOR_FORM_COLUMN = 620

// `phone` is 0 because the sheet becomes a full-width bottom sheet there and a pixel
// width would fight it.
export const EDITOR_SHEET_WIDTH: Record<ShellWidth, number> = {
  full: EDITOR_FORM_COLUMN,
  tight: EDITOR_FORM_COLUMN,
  stacked: 640,
  phone: 0,
}

export interface EditorSlotView {
  readonly key: EditorSlotKey
  readonly shape: EditorSlotShape
  readonly signGlyph: "+" | "−" | null
  readonly isIncoming: boolean
}

export interface EditorTypeView {
  readonly type: TransactionTypeTag
  readonly config: AnyTransactionTypeConfig
  readonly layout: EditorLayout
  readonly slots: readonly EditorSlotView[]
  readonly sharedAccount: boolean
  readonly sharedAsset: boolean
  readonly lockedMagnitude: boolean
  readonly showsCategory: boolean
  readonly showsDescription: boolean
  readonly showsOriginAsset: boolean
  readonly showsUnitPrice: boolean
  readonly showsFlowToggle: boolean
}

function hasRule(
  config: AnyTransactionTypeConfig,
  kind: TransactionRuleKind
): boolean {
  return config.rules.some((rule) => rule.kind === kind)
}

function signGlyph(shape: EditorSlotShape): "+" | "−" | null {
  switch (shape.sign) {
    case "positive":
      return "+"
    case "negative":
      return "−"
    case "nonZero":
      return null
  }
}

function slotView(
  config: AnyTransactionTypeConfig,
  shape: EditorSlotShape
): EditorSlotView {
  return {
    key: slotKeyOfField(config, shape.field),
    shape,
    signGlyph: signGlyph(shape),
    isIncoming: shape.placement === "incoming",
  }
}

/**
 * Outgoing first, so the seam arrow reads left-to-right as money leaving one side and
 * arriving on the tinted other. `EditorFrame` draws the incoming panel on the left; that
 * puts the arrow head on the source, which is the one thing in the frame that cannot be
 * read as written.
 */
function orderedSlots(
  config: AnyTransactionTypeConfig
): readonly EditorSlotView[] {
  const views = slotShapes(config).map((shape) => slotView(config, shape))
  if (views.length < 2) return views
  return [...views].sort((a, b) => Number(a.isIncoming) - Number(b.isIncoming))
}

export function editorTypeView(type: TransactionTypeTag): EditorTypeView {
  const config: AnyTransactionTypeConfig = TRANSACTION_TYPE_CONFIG[type]
  const slots = orderedSlots(config)
  return {
    type,
    config,
    layout: slots.length > 1 ? "dual" : "single",
    slots,
    sharedAccount: hasRule(config, "sameAccount"),
    sharedAsset: hasRule(config, "sameAsset"),
    lockedMagnitude: hasRule(config, "equalMagnitude"),
    showsCategory: config.fields.category,
    showsDescription: config.fields.description,
    showsOriginAsset: config.fields.originAsset,
    showsUnitPrice: config.fields.unitPrice,
    showsFlowToggle: slots.some((slot) => slot.shape.sign === "nonZero"),
  }
}

export interface ImpliedRateView {
  readonly label: string
  readonly value: number | null
  readonly note: string
}

export function impliedRateView(
  view: EditorTypeView,
  draft: EditorDraft,
  assetName: (assetId: number | null) => string
): ImpliedRateView | null {
  if (!view.showsUnitPrice) return null
  const unitSlots = view.slots.filter(
    (slot) => slot.shape.amountKind === "units"
  )
  const cash = view.slots.find((slot) => slot.shape.amountKind === "cash")
  const [given, received] = unitSlots

  if (given !== undefined && cash !== undefined) {
    return {
      label: "Implied unit price",
      value: impliedUnitPrice(
        magnitudeOf(draft.slots[given.key]),
        magnitudeOf(draft.slots[cash.key])
      ),
      note: `${assetName(draft.slots[cash.key].assetId)} per ${assetName(
        draft.slots[given.key].assetId
      )}`,
    }
  }

  if (given !== undefined && received !== undefined) {
    return {
      label: "Implied rate",
      value: impliedUnitPrice(
        magnitudeOf(draft.slots[received.key]),
        magnitudeOf(draft.slots[given.key])
      ),
      note: `${assetName(draft.slots[given.key].assetId)} per ${assetName(
        draft.slots[received.key].assetId
      )}`,
    }
  }

  return null
}

export interface DraftEntryLine {
  readonly key: string
  readonly assetId: number | null
  readonly accountId: string | null
  readonly amount: number | null
  readonly label: string
}

function feeAmount(fee: { amountText: string }): number | null {
  const magnitude = magnitudeOf(fee)
  return magnitude === null ? null : -magnitude
}

export function draftEntryLines(
  view: EditorTypeView,
  draft: EditorDraft
): readonly DraftEntryLine[] {
  const lines: DraftEntryLine[] = view.slots.map((slot) => ({
    key: slot.shape.field,
    assetId: draft.slots[slot.key].assetId,
    accountId: draft.slots[slot.key].accountId,
    amount: signedAmountOf(slot.shape, draft.slots[slot.key]) ?? null,
    label: slot.shape.label,
  }))

  for (const fee of draft.fees) {
    lines.push({
      key: fee.key,
      assetId: fee.assetId,
      accountId: fee.accountId,
      amount: feeAmount(fee),
      label: "Fee",
    })
  }

  return lines
}
