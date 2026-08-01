import { describe, expect, it } from "vitest"

import {
  ACCOUNT_CLASS_LABELS,
  ACCOUNT_CLASS_ORDER,
  accountClassRank,
  accountTypeTaxonomy,
  applyOwnershipShare,
  classifyAccountType,
  compareAccountClasses,
  isJointAccount,
  isKnownAccountType,
  isLiabilityAccountType,
  isLiabilityClass,
  isLiquidAccountType,
  ownershipSharePercent,
  SEEDED_ACCOUNT_TYPES,
  UNCLASSIFIED_ACCOUNT_CLASS,
  type AccountClass,
} from "./accounts"

const EXPECTED_CLASS_BY_NAME: Record<string, AccountClass> = {
  Current: "cash",
  Savings: "cash",
  Cash: "cash",
  Investment: "investments",
  "Personal Pension": "investments",
  "Workplace Pension": "investments",
  "Crypto Wallet": "investments",
  "Real Estate": "property",
  Credit: "liabilities",
  Mortgage: "liabilities",
  Loan: "liabilities",
}

describe("account type taxonomy", () => {
  it("covers exactly the eleven seeded types", () => {
    expect(SEEDED_ACCOUNT_TYPES).toHaveLength(11)
    expect(SEEDED_ACCOUNT_TYPES.map((entry) => entry.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ])
  })

  it.each(Object.entries(EXPECTED_CLASS_BY_NAME))(
    "maps %s to its designed class",
    (name, expected) => {
      const seeded = SEEDED_ACCOUNT_TYPES.find((entry) => entry.name === name)
      expect(seeded).toBeDefined()
      expect(classifyAccountType({ id: seeded!.id, name })).toBe(expected)
    }
  )

  it("resolves by id when the name is missing", () => {
    expect(classifyAccountType({ id: 7 })).toBe("liabilities")
    expect(classifyAccountType({ id: 7, name: null })).toBe("liabilities")
  })

  it("resolves by name when the id is unknown", () => {
    expect(classifyAccountType({ id: 999, name: "  mortgage " })).toBe(
      "liabilities"
    )
  })

  it("prefers the name over the id", () => {
    expect(classifyAccountType({ id: 1, name: "Mortgage" })).toBe("liabilities")
  })

  it("sends unknown types to the unclassified class instead of guessing", () => {
    expect(classifyAccountType({ id: 12, name: "Spread Bet" })).toBe(
      UNCLASSIFIED_ACCOUNT_CLASS
    )
    expect(classifyAccountType(null)).toBe(UNCLASSIFIED_ACCOUNT_CLASS)
    expect(classifyAccountType(undefined)).toBe(UNCLASSIFIED_ACCOUNT_CLASS)
    expect(isKnownAccountType({ id: 12, name: "Spread Bet" })).toBe(false)
    expect(isKnownAccountType({ id: 3 })).toBe(true)
  })

  it("returns the full taxonomy entry", () => {
    expect(accountTypeTaxonomy({ id: 2 })).toEqual({
      id: 2,
      name: "Savings",
      accountClass: "cash",
      liquid: true,
    })
    expect(accountTypeTaxonomy({ id: 99 })).toBeNull()
  })
})

describe("liquidity", () => {
  it("treats only Current, Savings and Cash as liquid today", () => {
    const liquid = SEEDED_ACCOUNT_TYPES.filter((entry) => entry.liquid).map(
      (entry) => entry.name
    )
    expect(liquid).toEqual(["Current", "Savings", "Cash"])
  })

  it.each([1, 2, 11])("marks type %i liquid", (id) => {
    expect(isLiquidAccountType({ id })).toBe(true)
  })

  it.each([3, 4, 5, 6, 7, 8, 9, 10])("marks type %i illiquid", (id) => {
    expect(isLiquidAccountType({ id })).toBe(false)
  })

  it("never claims an unknown type is liquid", () => {
    expect(isLiquidAccountType({ id: 12, name: "Spread Bet" })).toBe(false)
    expect(isLiquidAccountType(null)).toBe(false)
  })
})

describe("liabilities", () => {
  it.each([4, 7, 8])("treats type %i as a liability", (id) => {
    expect(isLiabilityAccountType({ id })).toBe(true)
  })

  it.each([1, 2, 3, 5, 6, 9, 10, 11])(
    "does not treat type %i as a liability",
    (id) => {
      expect(isLiabilityAccountType({ id })).toBe(false)
    }
  )

  it("recognises the class directly", () => {
    expect(isLiabilityClass("liabilities")).toBe(true)
    expect(isLiabilityClass("cash")).toBe(false)
  })
})

describe("class ordering", () => {
  it("sorts liabilities last", () => {
    expect(ACCOUNT_CLASS_ORDER.at(-1)).toBe("liabilities")
    const shuffled: AccountClass[] = [
      "liabilities",
      "property",
      "cash",
      "other",
      "investments",
    ]
    expect([...shuffled].sort(compareAccountClasses)).toEqual([
      ...ACCOUNT_CLASS_ORDER,
    ])
  })

  it("ranks every class and labels every class", () => {
    for (const accountClass of ACCOUNT_CLASS_ORDER) {
      expect(accountClassRank(accountClass)).toBeGreaterThanOrEqual(0)
      expect(ACCOUNT_CLASS_LABELS[accountClass]).toBeTruthy()
    }
  })
})

describe("ownership share", () => {
  it("flags a share below one as joint", () => {
    expect(isJointAccount(0.5)).toBe(true)
    expect(isJointAccount(1)).toBe(false)
    expect(isJointAccount(Number.NaN)).toBe(false)
  })

  it("converts a fraction to a percentage", () => {
    expect(ownershipSharePercent(0.5)).toBe(50)
    expect(ownershipSharePercent(1)).toBe(100)
  })

  it("applies the share to a value", () => {
    expect(applyOwnershipShare(1000, 0.5)).toBe(500)
    expect(applyOwnershipShare(-1000, 0.5)).toBe(-500)
  })
})
