import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PageHeader, SectionHeader } from "./page-header"

function slot(name: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`[data-slot="${name}"]`)
  if (node === null) throw new Error(`no [data-slot="${name}"]`)
  return node
}

function unwrappableChildren(node: HTMLElement): HTMLElement[] {
  return [...node.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.getAttribute("aria-hidden") === null &&
      /(^|\s)flex-none(\s|$)/.test(child.className)
  )
}

describe("SectionHeader", () => {
  it("wraps instead of overflowing when label, note and action cannot share a line", () => {
    render(
      <SectionHeader
        label="Composition"
        note="34 holdings across 6 accounts"
        action={<button type="button">Assets / Accounts / Currency</button>}
      />
    )

    const header = slot("section-header")
    expect(header.className).toMatch(/(^|\s)flex-wrap(\s|$)/)
    expect(unwrappableChildren(header)).toHaveLength(0)
  })

  it("keeps the label shrinkable so a long one cannot push the row wider", () => {
    render(
      <SectionHeader label="Custom assets priced by you, not by market data" />
    )

    const label = slot("section-header").firstElementChild as HTMLElement
    expect(label.className).toMatch(/(^|\s)min-w-0(\s|$)/)
  })
})

describe("PageHeader", () => {
  it("wraps its actions below the title rather than overflowing", () => {
    render(
      <PageHeader
        eyebrow="Ledger"
        title="Transactions"
        actions={<button type="button">New transaction</button>}
      />
    )

    const header = slot("page-header")
    expect(header.className).toMatch(/(^|\s)flex-wrap(\s|$)/)
  })

  it("lets a long title break instead of forcing the page wider", () => {
    render(
      <PageHeader title="Vanguard FTSE Developed World ex-UK Equity Index" />
    )

    const heading = document.querySelector("h1")
    expect(heading?.className).not.toMatch(/whitespace-nowrap/)
    expect(heading?.className).toMatch(/wrap-break-word/)
  })
})
