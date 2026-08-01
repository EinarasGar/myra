import { describe, expect, it } from "vitest"

import {
  DESTINATIONS,
  destinationFor,
  isDestinationActive,
  RAIL_NAV,
  TAB_NAV,
  titleForPathname,
} from "./navigation"

describe("navigation model", () => {
  it("matches the dashboard only on an exact path", () => {
    const dashboard = DESTINATIONS.find((item) => item.id === "dashboard")!
    expect(isDestinationActive(dashboard, "/")).toBe(true)
    expect(isDestinationActive(dashboard, "/transactions")).toBe(false)
  })

  it("keeps a section active on its child paths", () => {
    const accounts = DESTINATIONS.find((item) => item.id === "accounts")!
    expect(isDestinationActive(accounts, "/accounts")).toBe(true)
    expect(isDestinationActive(accounts, "/accounts/abc")).toBe(true)
    expect(isDestinationActive(accounts, "/accounts-archive")).toBe(false)
  })

  it("resolves one destination per path", () => {
    expect(destinationFor("/")?.id).toBe("dashboard")
    expect(destinationFor("/transactions")?.id).toBe("transactions")
    expect(destinationFor("/settings/categories")?.id).toBe("settings")
    expect(destinationFor("/nope")).toBeUndefined()
  })

  it("derives the document title from the same model the nav uses", () => {
    expect(titleForPathname("/portfolio")).toBe("Portfolio · Sverto")
    expect(titleForPathname("/nope")).toBe("Sverto")
  })

  it("puts the review badge on the ledger rail item and the review tab", () => {
    expect(
      RAIL_NAV.filter((item) => item.badge).map((item) => item.id)
    ).toEqual(["transactions"])
    expect(TAB_NAV.map((item) => item.id)).toEqual([
      "dashboard",
      "transactions",
      "review",
      "portfolio",
      "myra",
    ])
  })
})
