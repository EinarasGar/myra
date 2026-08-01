import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { EntityMark, EntityMarkGroup } from "./entity-mark"
import {
  ENTITY_MARK_SLOTS,
  entityMarkSlot,
  entityMonogram,
  TILE_PALETTE,
} from "./entity-mark-identity"

describe("entityMarkSlot", () => {
  it("returns the same slot for the same seed every time", () => {
    const seed = "11111111-1111-1111-1111-111111111101"
    expect(entityMarkSlot(seed)).toBe(entityMarkSlot(seed))
  })

  it("stays inside the palette for any seed", () => {
    const seeds = Array.from({ length: 500 }, (_, index) => `account-${index}`)
    for (const seed of seeds) {
      const slot = entityMarkSlot(seed)
      expect(slot).toBeGreaterThanOrEqual(0)
      expect(slot).toBeLessThan(ENTITY_MARK_SLOTS)
    }
  })

  it("spreads seeds across every slot", () => {
    const used = new Set(
      Array.from({ length: 200 }, (_, index) =>
        entityMarkSlot(`account-${index}`)
      )
    )
    expect(used.size).toBe(ENTITY_MARK_SLOTS)
  })

  it("draws only from the chart palette, never from a semantic colour", () => {
    expect(TILE_PALETTE).toHaveLength(8)
    for (const token of TILE_PALETTE) {
      expect(token).toMatch(/^bg-chart-[1-8]\/14 text-chart-[1-8]$/)
    }
  })
})

describe("entityMonogram", () => {
  it.each([
    ["Lloyds Current Account", "LC"],
    ["Amex Credit Card", "AC"],
    ["Coinbase", "CO"],
    ["Joint Bills - Starling", "JB"],
    ["  ", "?"],
  ])("turns %s into %s", (label, expected) => {
    expect(entityMonogram(label)).toBe(expected)
  })
})

describe("EntityMark", () => {
  it("is decorative, so the name beside it stays the only accessible label", () => {
    render(<EntityMark seed="account-1" label="Lloyds Current Account" />)
    const mark = document.querySelector('[data-slot="entity-mark"]')
    expect(mark).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText("LC")).toBeInTheDocument()
  })

  it("paints the palette slot its seed resolves to", () => {
    render(<EntityMark seed="account-1" label="Lloyds" />)
    expect(screen.getByText("LL")).toHaveClass(
      ...(TILE_PALETTE[entityMarkSlot("account-1")] ?? "").split(" ")
    )
  })
})

describe("EntityMarkGroup", () => {
  it("renders nothing when there is no entity", () => {
    const { container } = render(<EntityMarkGroup entities={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("stacks at most two marks for a multi-account row", () => {
    render(
      <EntityMarkGroup
        entities={[
          { seed: "a", label: "Lloyds Current Account" },
          { seed: "b", label: "Cash Wallet" },
          { seed: "c", label: "Marcus Savings" },
        ]}
      />
    )
    expect(document.querySelectorAll('[data-slot="entity-mark"]')).toHaveLength(
      2
    )
    expect(screen.getByText("LC")).toBeInTheDocument()
    expect(screen.getByText("CW")).toBeInTheDocument()
  })
})
