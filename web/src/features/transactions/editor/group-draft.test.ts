import { describe, expect, it } from "vitest"

import { toGroupRow, toLookupIndex } from "../api"
import {
  assetPurchase,
  groupItem,
  lookupTables,
  regular,
} from "../api/fixtures"

import {
  editedGroup,
  groupEditorDraft,
  groupEditorErrors,
  isGroupEditorDraftDirty,
  isGroupEditorDraftValid,
  withGroupDate,
} from "./group-draft"

const NOW = new Date("2026-07-31T12:00:00Z")

function group() {
  return toGroupRow(
    groupItem([regular(), assetPurchase()]) as Parameters<typeof toGroupRow>[0],
    toLookupIndex(lookupTables)
  )
}

describe("groupEditorDraft", () => {
  it("seeds every field off the group, never off its children", () => {
    const subject = group()
    const draft = groupEditorDraft(subject)
    expect(draft.description).toBe(subject.raw.description)
    expect(draft.date).toBe(subject.raw.date)
    expect(draft.categoryId).toBe(subject.raw.category_id)
  })

  it("reports a draft as clean until a field actually moves", () => {
    const subject = group()
    const draft = groupEditorDraft(subject)
    expect(isGroupEditorDraftDirty(subject, draft)).toBe(false)
    expect(
      isGroupEditorDraftDirty(subject, { ...draft, description: "Other" })
    ).toBe(true)
  })
})

describe("groupEditorErrors", () => {
  it("refuses a blank description, an unreadable date and no category", () => {
    const errors = groupEditorErrors({
      description: "   ",
      dateText: "the day before whenever",
      date: null,
      categoryId: null,
    })
    expect(errors.description).toBe("A group needs a description.")
    expect(errors.date).toMatch(/could not be read/)
    expect(errors.category).toBe("A group needs a category.")
  })

  it("separates an empty date box from one it cannot read", () => {
    expect(
      groupEditorErrors({
        description: "Shop",
        dateText: "",
        date: null,
        categoryId: 7,
      }).date
    ).toBe("A group needs a date.")
  })

  it("refuses a description past the length the server accepts", () => {
    expect(
      groupEditorErrors({
        description: "x".repeat(501),
        dateText: "2026-07-14",
        date: 1,
        categoryId: 7,
      }).description
    ).toMatch(/under 500/)
  })
})

describe("editedGroup", () => {
  it("carries the children across by reference so none can be dropped", () => {
    const subject = group()
    const draft = { ...groupEditorDraft(subject), description: "Renamed" }
    const next = editedGroup(subject, draft)

    expect(next).not.toBeNull()
    expect(next?.transactions).toBe(subject.raw.transactions)
    expect(next?.transactions).toHaveLength(2)
    expect(next?.description).toBe("Renamed")
    expect(next?.group_id).toBe(subject.raw.group_id)
  })

  it("trims the description the server would otherwise store padded", () => {
    const subject = group()
    const next = editedGroup(subject, {
      ...groupEditorDraft(subject),
      description: "  Renamed  ",
    })
    expect(next?.description).toBe("Renamed")
  })

  it("builds nothing at all from an invalid draft", () => {
    const subject = group()
    expect(
      editedGroup(subject, { ...groupEditorDraft(subject), description: "" })
    ).toBeNull()
    expect(
      editedGroup(subject, { ...groupEditorDraft(subject), categoryId: null })
    ).toBeNull()
  })
})

describe("withGroupDate", () => {
  it("parses as it types and reports a valid draft only once it reads", () => {
    const subject = group()
    const draft = groupEditorDraft(subject)
    const broken = withGroupDate(draft, "20xx", NOW)
    expect(broken.date).toBeNull()
    expect(isGroupEditorDraftValid(broken)).toBe(false)

    const fixed = withGroupDate(draft, "2026-07-14", NOW)
    expect(fixed.date).not.toBeNull()
    expect(isGroupEditorDraftValid(fixed)).toBe(true)
  })
})
