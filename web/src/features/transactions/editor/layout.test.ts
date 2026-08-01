import { describe, expect, it } from "vitest"

import { TRANSACTION_TYPES } from "@/lib/domain/transaction-types"
import { SHELL_WIDTHS } from "@/components/layout/breakpoints"

import { emptyDraft, setSlot } from "./draft"
import {
  draftEntryLines,
  EDITOR_FORM_COLUMN,
  EDITOR_SHEET_WIDTH,
  editorTypeView,
  impliedRateView,
} from "./layout"

const SEED = { date: 1_753_920_000, dateText: "26 Jul 2026" }

const name = (assetId: number | null) =>
  assetId === null ? "—" : assetId === 1 ? "GBP" : "VUSA.LSE"

describe("the editor's type view", () => {
  it.each(TRANSACTION_TYPES)("resolves a layout for %s", (type) => {
    const view = editorTypeView(type)
    expect(view.slots.length).toBeGreaterThan(0)
    expect(view.layout).toBe(view.slots.length > 1 ? "dual" : "single")
  })

  it("puts the outgoing side first so the seam arrow points at the destination", () => {
    const view = editorTypeView("asset_purchase")
    expect(view.slots.map((slot) => slot.isIncoming)).toEqual([false, true])
  })

  it("shares one account when the type requires both sides in the same one", () => {
    expect(editorTypeView("asset_purchase").sharedAccount).toBe(true)
    expect(editorTypeView("asset_sale").sharedAccount).toBe(true)
    expect(editorTypeView("cash_balance_transfer").sharedAccount).toBe(false)
  })

  it("collapses a cash balance transfer to one asset and one amount", () => {
    const view = editorTypeView("cash_balance_transfer")
    expect(view.sharedAsset).toBe(true)
    expect(view.lockedMagnitude).toBe(true)
  })

  it("leaves an asset balance transfer's two sides independent, as the API does", () => {
    const view = editorTypeView("asset_balance_transfer")
    expect(view.sharedAsset).toBe(false)
    expect(view.lockedMagnitude).toBe(false)
  })

  it("offers a direction toggle only where the sign is information", () => {
    const withToggle = TRANSACTION_TYPES.filter(
      (type) => editorTypeView(type).showsFlowToggle
    )
    expect(withToggle).toEqual(["regular"])
  })

  it("shows a category on exactly one type", () => {
    const withCategory = TRANSACTION_TYPES.filter(
      (type) => editorTypeView(type).showsCategory
    )
    expect(withCategory).toEqual(["regular"])
  })
})

describe("the implied rate", () => {
  it("is cash per unit on a purchase", () => {
    const view = editorTypeView("asset_purchase")
    let draft = emptyDraft({ ...SEED, type: "asset_purchase" })
    draft = setSlot(draft, "primary", { amountText: "672.80", assetId: 1 })
    draft = setSlot(draft, "counter", { amountText: "8", assetId: 40 })

    expect(impliedRateView(view, draft, name)).toEqual({
      label: "Implied unit price",
      value: 84.1,
      note: "GBP per VUSA.LSE",
    })
  })

  it("is unit per unit on a trade", () => {
    const view = editorTypeView("asset_trade")
    let draft = emptyDraft({ ...SEED, type: "asset_trade" })
    draft = setSlot(draft, "primary", { amountText: "12", assetId: 40 })
    draft = setSlot(draft, "counter", { amountText: "0.5", assetId: 41 })

    const rate = impliedRateView(view, draft, name)
    expect(rate?.label).toBe("Implied rate")
    expect(rate?.value).not.toBeNull()
  })

  it("is null rather than zero while a side is empty", () => {
    const view = editorTypeView("asset_purchase")
    const draft = emptyDraft({ ...SEED, type: "asset_purchase" })
    expect(impliedRateView(view, draft, name)?.value).toBeNull()
  })

  it("does not exist on a type with no unit price", () => {
    const view = editorTypeView("cash_balance_transfer")
    const draft = emptyDraft({ ...SEED, type: "cash_balance_transfer" })
    expect(impliedRateView(view, draft, name)).toBeNull()
  })
})

describe("what gets saved", () => {
  it("lists every entry and fee with its signed amount", () => {
    const view = editorTypeView("asset_purchase")
    let draft = emptyDraft({ ...SEED, type: "asset_purchase" })
    draft = setSlot(draft, "primary", { amountText: "672.80", assetId: 1 })
    draft = setSlot(draft, "counter", { amountText: "8", assetId: 40 })
    draft = {
      ...draft,
      fees: [
        {
          key: "fee-1",
          accountId: null,
          assetId: 1,
          amountText: "1.20",
          feeType: "transaction",
          entryId: null,
        },
      ],
    }

    expect(draftEntryLines(view, draft).map((line) => line.amount)).toEqual([
      -672.8, 8, -1.2,
    ])
  })
})

describe("the sheet width", () => {
  it("is one form column wherever a pixel width applies", () => {
    expect(EDITOR_SHEET_WIDTH.full).toBe(EDITOR_FORM_COLUMN)
    expect(EDITOR_SHEET_WIDTH.tight).toBe(EDITOR_FORM_COLUMN)
  })

  it("never asks for more than the narrowest viewport of its band", () => {
    const narrowest: Record<string, number> = {
      full: 1280,
      tight: 1024,
      stacked: 768,
      phone: 390,
    }
    for (const width of SHELL_WIDTHS) {
      expect(EDITOR_SHEET_WIDTH[width]).toBeLessThanOrEqual(
        narrowest[width] ?? 0
      )
    }
  })
})
