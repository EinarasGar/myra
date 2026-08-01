import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Response } from "./response"

const TABLE = `### Portfolio

| Asset | Market value |
|:---|:---|
| Apple Inc | £12,480.20 |
| Cash | £1,204.00 |
`

describe("Response, Myra's markdown surface", () => {
  it("renders emphasis, headings and lists instead of their source", () => {
    render(
      <Response>{`Your net worth is **£156,452.75** today.

## Where it sits

- Liquid: £4,120.00
- Invested: £152,332.75
`}</Response>
    )

    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument()
    expect(screen.getByText("£156,452.75").tagName).toBe("SPAN")
    expect(
      screen.getByRole("heading", { level: 2, name: "Where it sits" })
    ).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it("maps headings onto the type scale rather than browser defaults", () => {
    render(<Response>{"# Title\n\n## Section\n\n### Eyebrow\n"}</Response>)

    expect(screen.getByRole("heading", { level: 1 })).toHaveClass(
      "text-[15px]",
      "font-bold"
    )
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass(
      "text-[13.5px]",
      "font-semibold"
    )
    expect(
      within(screen.getByRole("heading", { level: 3 })).getByText("Eyebrow")
    ).toHaveClass("uppercase", "tracking-[0.12em]")
  })

  it("prints numbers inside prose as figures", () => {
    render(<Response>{"Groceries came to £412.50, up 4.2% on May."}</Response>)

    const money = screen.getByText("£412.50")
    expect(money).toHaveAttribute("data-figure")
    expect(money).toHaveClass("font-mono", "tabular-nums")
    expect(screen.getByText("4.2%")).toHaveAttribute("data-figure")
  })

  it("gives a markdown table the data-table look and right-aligns its figure column", () => {
    render(<Response>{TABLE}</Response>)

    const header = screen.getByRole("columnheader", { name: "Market value" })
    expect(header).toHaveClass("uppercase", "text-right")
    expect(header.style.textAlign).toBe("")

    const cell = screen.getByRole("cell", { name: "£12,480.20" })
    expect(cell).toHaveClass("text-right")
    expect(cell.style.textAlign).toBe("")
    expect(screen.getByRole("cell", { name: "Apple Inc" })).toHaveClass(
      "text-left"
    )
  })

  it("copies a table as tab-separated rows a spreadsheet can take", async () => {
    const user = userEvent.setup()
    render(<Response>{TABLE}</Response>)

    await user.click(screen.getByRole("button", { name: /copy table/i }))

    await waitFor(async () => {
      expect(await navigator.clipboard.readText()).toBe(
        "Asset\tMarket value\nApple Inc\t£12,480.20\nCash\t£1,204.00"
      )
    })
    expect(
      await screen.findByRole("button", { name: /copied/i })
    ).toBeInTheDocument()
  })

  it("labels a fenced block with its language and copies the source", async () => {
    const user = userEvent.setup()
    render(<Response>{'```json\n{ "net_worth": 156452.75 }\n```'}</Response>)

    const block = document.querySelector('[data-slot="markdown-code-block"]')
    expect(block).toHaveAttribute("data-language", "json")
    expect(screen.getByText("json")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /copy code/i }))
    await waitFor(async () => {
      expect(await navigator.clipboard.readText()).toBe(
        '{ "net_worth": 156452.75 }'
      )
    })
  })

  it("keeps inline code inline rather than promoting it to a block", () => {
    render(<Response>{"Call `aggregate_transactions` for that."}</Response>)

    const inline = screen.getByText("aggregate_transactions")
    expect(inline.tagName).toBe("CODE")
    expect(inline.closest("pre")).toBeNull()
    expect(inline).toHaveClass("font-mono")
  })

  it("marks external links and never emits a javascript: href", () => {
    render(
      <Response>{`[docs](https://example.com/docs) and [ledger](/transactions) and [bad](javascript:alert(1))`}</Response>
    )

    const external = screen.getByRole("link", { name: /docs/i })
    expect(external).toHaveAttribute("href", "https://example.com/docs")
    expect(external).toHaveAttribute("target", "_blank")
    expect(external).toHaveAttribute("rel", expect.stringContaining("noopener"))
    expect(within(external).getByText(/opens in a new tab/i)).toBeTruthy()

    const internal = screen.getByRole("link", { name: "ledger" })
    expect(internal).toHaveAttribute("href", "/transactions")
    expect(internal).not.toHaveAttribute("target")

    expect(screen.queryByRole("link", { name: "bad" })).toBeNull()
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull()
  })

  it("renders a half-written table as a table, not as broken pipe text", () => {
    const partial = "| Asset | Value |\n|:---|---:|\n| Apple Inc | £12,4"
    const { rerender } = render(<Response streaming>{partial}</Response>)

    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.queryByText(/\|:---\|/)).not.toBeInTheDocument()

    rerender(<Response streaming>{`${partial}80.20 |\n`}</Response>)
    expect(screen.getByRole("cell", { name: "£12,480.20" })).toBeInTheDocument()
  })

  it("typesets math rather than printing the TeX", () => {
    render(
      <Response>{"The growth rate is $$r = \\frac{V_1}{V_0} - 1$$."}</Response>
    )

    expect(document.querySelector(".katex")).not.toBeNull()
    expect(screen.queryByText(/\$\$/)).not.toBeInTheDocument()
  })

  it("does not close an unfinished bold run with visible asterisks", () => {
    render(<Response streaming>{"Your net worth is **£156,45"}</Response>)

    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument()
    expect(document.querySelector("strong")).not.toBeNull()
  })
})
