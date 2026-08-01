import { describe, expect, it } from "vitest"

import {
  assetPurchase,
  cashBalanceTransfer,
  cashDividend,
  regular,
} from "../api/fixtures"
import {
  draftFromTransaction,
  emptyDraft,
  magnitudeOf,
  setSlot,
  signedAmountOf,
  slotShapeFor,
  withType,
} from "./draft"
import { editorTypeView } from "./layout"

const SEED = { date: 1_753_920_000, dateText: "26 Jul 2026" }

describe("the editor draft", () => {
  it("keeps what was typed when the type changes", () => {
    let draft = emptyDraft({ ...SEED, type: "regular" })
    draft = setSlot(draft, "primary", {
      accountId: "acct",
      assetId: 1,
      amountText: "42.18",
    })
    draft = { ...draft, description: "Tesco", categoryId: 7 }

    const moved = withType(draft, "cash_transfer_out")

    expect(moved.slots.primary.amountText).toBe("42.18")
    expect(moved.slots.primary.accountId).toBe("acct")
    expect(moved.slots.primary.assetId).toBe(1)
    expect(moved.description).toBe("Tesco")
    expect(moved.categoryId).toBe(7)
  })

  it("restores the counter side when the user switches back", () => {
    let draft = emptyDraft({ ...SEED, type: "asset_purchase" })
    draft = setSlot(draft, "counter", { amountText: "8", assetId: 40 })

    const away = withType(draft, "regular")
    const back = withType(away, "asset_purchase")

    expect(back.slots.counter.amountText).toBe("8")
    expect(back.slots.counter.assetId).toBe(40)
  })

  it("drops entry ids on a type change because they belong to the old shape", () => {
    const draft = draftFromTransaction(regular(), "26 Jul 2026")
    expect(draft.slots.primary.entryId).not.toBeNull()
    expect(
      withType(draft, "cash_transfer_out").slots.primary.entryId
    ).toBeNull()
  })

  it("normalises the flow to whatever sign the new slot requires", () => {
    let draft = emptyDraft({ ...SEED, type: "regular" })
    draft = setSlot(draft, "primary", { flow: "out", amountText: "10" })

    expect(withType(draft, "cash_transfer_in").slots.primary.flow).toBe("in")
    expect(withType(draft, "cash_transfer_out").slots.primary.flow).toBe("out")
  })

  it("keeps the typed direction on the one type where the sign carries meaning", () => {
    let draft = emptyDraft({ ...SEED, type: "cash_transfer_in" })
    draft = setSlot(draft, "primary", { amountText: "10" })
    const asPurchase = withType(draft, "regular")

    expect(asPurchase.slots.primary.flow).toBe("in")
    const shape = slotShapeFor(editorTypeView("regular").config, "primary")
    expect(shape).not.toBeNull()
    expect(signedAmountOf(shape!, asPurchase.slots.primary)).toBe(10)
  })

  it("reads an existing transaction back as magnitudes plus a direction", () => {
    const draft = draftFromTransaction(regular(), "26 Jul 2026")
    expect(draft.type).toBe("regular")
    expect(draft.slots.primary.amountText).toBe("42.18")
    expect(draft.slots.primary.flow).toBe("out")
    expect(draft.description).toBe("Tesco")
    expect(draft.categoryId).toBe(7)
  })

  it("maps a dual transaction onto its primary and counter slots", () => {
    const draft = draftFromTransaction(assetPurchase(), "26 Jul 2026")
    expect(draft.slots.primary.amountText).toBe("672.8")
    expect(draft.slots.counter.amountText).toBe("8")
    expect(draft.slots.primary.assetId).not.toBe(draft.slots.counter.assetId)
  })

  it("round-trips a balance transfer's two sides", () => {
    const draft = draftFromTransaction(cashBalanceTransfer(), "26 Jul 2026")
    expect(magnitudeOf(draft.slots.primary)).toBe(200)
    expect(magnitudeOf(draft.slots.counter)).toBe(200)
    expect(draft.slots.primary.accountId).not.toBe(
      draft.slots.counter.accountId
    )
  })

  it("carries the origin asset of a cash dividend", () => {
    expect(
      draftFromTransaction(cashDividend(), "26 Jul 2026").originAssetId
    ).toBe(40)
  })

  it("treats a half-typed number as not yet a number", () => {
    expect(magnitudeOf({ amountText: "42." })).toBe(42)
    expect(magnitudeOf({ amountText: "" })).toBeNull()
    expect(magnitudeOf({ amountText: "abc" })).toBeNull()
    expect(magnitudeOf({ amountText: "-12" })).toBe(12)
  })
})
