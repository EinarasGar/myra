import { render, screen } from "@testing-library/react"
import { Receipt } from "lucide-react"
import { describe, expect, it } from "vitest"

import { GlyphIcon, RowGlyph, type RowGlyphTone } from "./row-glyph"

const TONE_CLASS: Record<RowGlyphTone, string> = {
  in: "text-positive",
  out: "text-ink-2",
  neutral: "text-ink-3",
}

describe("GlyphIcon", () => {
  it("brings no centring of its own, so it can sit at the head of a flex row", () => {
    const { container } = render(<GlyphIcon icon={Receipt} />)
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("class")).not.toContain("mx-auto")
  })

  it("centres only when a table cell asks it to", () => {
    render(<RowGlyph icon={Receipt} label="Purchase" />)
    expect(document.querySelector('[data-slot="row-glyph"]')).toHaveClass(
      "mx-auto"
    )
  })
})

describe("RowGlyph", () => {
  it("carries a text alternative so the column is not decoration", () => {
    render(<RowGlyph icon={Receipt} label="Purchase" />)
    expect(screen.getByText("Purchase")).toHaveClass("sr-only")
  })

  it.each(Object.keys(TONE_CLASS) as RowGlyphTone[])(
    "tints a %s row with its direction colour",
    (tone) => {
      render(<RowGlyph icon={Receipt} label="Purchase" tone={tone} />)
      const glyph = document.querySelector('[data-slot="row-glyph"]')
      expect(glyph).toHaveAttribute("data-tone", tone)
      expect(glyph).toHaveClass(TONE_CLASS[tone])
    }
  )

  it("keeps the type icon on an unreviewed row and only ghosts it", () => {
    render(<RowGlyph icon={Receipt} label="Purchase" tone="out" muted />)
    const glyph = document.querySelector('[data-slot="row-glyph"]')
    expect(glyph?.querySelector("svg")).toBeInTheDocument()
    expect(glyph).toHaveClass("text-ghost")
    expect(glyph).not.toHaveClass("text-ink-2")
  })
})
