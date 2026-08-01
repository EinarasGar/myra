import { useState } from "react"

import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { planLedgerQuery } from "../api"

import { UNSUPPORTED_COPY } from "./copy"
import { QueryBar } from "./query-bar"
import type { ExploreSearch, TokenLabels } from "./tokens"
import { buildLedgerTokens } from "./tokens"
import { renderExplore, stubViewport, VIEWPORTS } from "./test-harness"

const LABELS: TokenLabels = {
  accountName: () => "Lloyds Current",
  categoryName: () => "Groceries",
}

const onPatch = vi.fn()
const onClearAll = vi.fn()

async function renderBar(search: ExploreSearch) {
  const tokens = buildLedgerTokens(search, LABELS)
  return renderExplore(
    <QueryBar
      tokens={tokens}
      plan={planLedgerQuery(tokens)}
      onPatch={onPatch}
      onClearAll={onClearAll}
    />
  )
}

function token(key: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-token="${key}"]`)
}

beforeEach(() => {
  onPatch.mockReset()
  onClearAll.mockReset()
  stubViewport(VIEWPORTS.full)
})

afterEach(cleanup)

describe("a filter the server can execute", () => {
  it("reads as live", async () => {
    await renderBar({ account: "a1" })
    const chip = token("account")
    expect(chip?.dataset["applied"]).toBe("true")
    expect(chip?.textContent).toContain("Lloyds Current")
    expect(chip?.className).toContain("bg-brand-dim")
    expect(
      document.querySelector('[data-slot="unsupported-filters"]')
    ).toBeNull()
  })

  it("keeps text live on the combined stream", async () => {
    await renderBar({ q: "tesco" })
    expect(token("text")?.dataset["applied"]).toBe("true")
  })
})

describe("a chip whose label resolves later", () => {
  it("stays mounted instead of being replaced when the name arrives", async () => {
    let resolve: () => void = () => {}
    function Driver() {
      const [resolved, set] = useState(false)
      resolve = () => {
        set(true)
      }
      const tokens = buildLedgerTokens(
        { account: "a1" },
        {
          accountName: (id) => (resolved ? "Lloyds Current" : id),
          categoryName: () => "Groceries",
        }
      )
      return (
        <QueryBar
          tokens={tokens}
          plan={planLedgerQuery(tokens)}
          onPatch={onPatch}
          onClearAll={onClearAll}
        />
      )
    }

    await renderExplore(<Driver />)
    const before = token("account")
    expect(before?.textContent).toContain("a1")

    act(() => {
      resolve()
    })
    const after = token("account")
    expect(after?.textContent).toContain("Lloyds Current")
    expect(after).toBe(before)
  })
})

describe("a filter the server cannot execute", () => {
  it("never reads as live", async () => {
    await renderBar({ from: "2026-07-01", to: "2026-07-31" })
    for (const key of ["dateFrom", "dateTo"]) {
      const chip = token(key)
      expect(chip?.dataset["applied"]).toBe("false")
      expect(chip?.textContent).toContain("Not applied")
      expect(chip?.innerHTML).toContain("line-through")
    }
  })

  it("says why, once per dimension, in words and in the title", async () => {
    await renderBar({ from: "2026-07-01", to: "2026-07-31", category: 7 })
    const notes = document.querySelectorAll("[data-unsupported]")
    expect(notes).toHaveLength(3)
    expect(
      document.querySelector('[data-unsupported="category"]')?.textContent
    ).toContain("twelve of the thirteen")
    expect(token("dateFrom")?.getAttribute("title")).toBe(
      UNSUPPORTED_COPY.dateFrom
    )
  })

  it("demotes text the moment an account joins it", async () => {
    await renderBar({ q: "tesco", account: "a1" })
    expect(token("text")?.dataset["applied"]).toBe("false")
    expect(token("account")?.dataset["applied"]).toBe("true")
    expect(
      document.querySelector('[data-unsupported="text"]')?.textContent
    ).toContain("search terms are ignored")
  })
})

describe("typing", () => {
  it("commits a bare phrase as a description search", async () => {
    await renderBar({})
    const input = screen.getByLabelText("Filter transactions")
    fireEvent.change(input, { target: { value: "weekly shop" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onPatch).toHaveBeenCalledWith({ q: "weekly shop" })
  })

  it("commits a typed key as its own token", async () => {
    await renderBar({})
    const input = screen.getByLabelText("Filter transactions")
    fireEvent.change(input, { target: { value: "from:2026-07-01" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onPatch).toHaveBeenCalledWith({ from: "2026-07-01" })
  })

  it("refuses a date it cannot read, and filters nothing meanwhile", async () => {
    await renderBar({})
    const input = screen.getByLabelText("Filter transactions")
    fireEvent.change(input, { target: { value: "from:yesterday" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onPatch).not.toHaveBeenCalled()
    expect(screen.getByRole("alert").textContent).toContain("not a date")
  })

  it("backspaces the last token off an empty input", async () => {
    await renderBar({ q: "tesco", from: "2026-07-01" })
    const input = screen.getByLabelText("Filter transactions")
    fireEvent.keyDown(input, { key: "Backspace" })
    expect(onPatch).toHaveBeenCalledWith({ from: undefined })
  })
})

describe("removing filters", () => {
  it("clears one token from its own ✕", async () => {
    await renderBar({ account: "a1" })
    fireEvent.click(
      screen.getByRole("button", { name: "Remove account filter" })
    )
    expect(onPatch).toHaveBeenCalledWith({ account: undefined })
  })

  it("offers Clear only when something is filtering", async () => {
    await renderBar({})
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()

    cleanup()
    await renderBar({ q: "tesco" })
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(onClearAll).toHaveBeenCalledTimes(1)
  })
})
