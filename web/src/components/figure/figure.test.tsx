import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  ARROW_DOWN,
  ARROW_UP,
  EM_DASH,
  MINUS,
  MISSING_MONEY_CURRENCY,
  NBSP,
  type SignDisplay,
} from "@/lib/format"

import { Figure } from "./figure"
import { resolveFigureTone, type FigureIntent } from "./figure-variants"

const session = vi.hoisted(() => ({
  baseCurrency: "GBP" as string | null,
  reads: 0,
}))

vi.mock("./base-currency", () => ({
  useFigureBaseCurrency: () => {
    session.reads += 1
    return session.baseCurrency
  },
}))

afterEach(() => {
  session.baseCurrency = "GBP"
  session.reads = 0
})

function renderFigure(element: React.ReactElement) {
  render(element)
  return screen.getByTestId("figure")
}

describe("Figure typography", () => {
  it("is mono, tabular and unbreakable", () => {
    const figure = renderFigure(
      <Figure data-testid="figure" value={1020} currency="GBP" />
    )
    expect(figure).toHaveClass(
      "font-mono",
      "whitespace-nowrap",
      "tabular-nums",
      "leading-none"
    )
    expect(figure).toHaveAttribute("data-figure")
  })

  it("never carries a motion utility, because numbers cut", () => {
    const figure = renderFigure(
      <Figure data-testid="figure" value={1020} currency="GBP" size="hero" />
    )
    expect(figure.className).not.toMatch(/transition|animate|duration/)
  })

  it("scales the hero figure with the breakpoint ladder", () => {
    const figure = renderFigure(
      <Figure data-testid="figure" value={1020} currency="GBP" size="hero" />
    )
    expect(figure).toHaveClass(
      "text-[30px]",
      "md:text-[36px]",
      "lg:text-[40px]",
      "xl:text-[52px]",
      "tracking-[-0.045em]"
    )
  })

  it("carries the size ladder from the type spec", () => {
    const sizes = [
      ["lg", "text-[34px]"],
      ["md", "text-[17px]"],
      ["base", "text-[13.5px]"],
      ["micro", "text-[11px]"],
      ["delta", "text-[14px]"],
    ] as const
    for (const [size, expected] of sizes) {
      render(
        <Figure
          data-testid={`figure-${size}`}
          value={1020}
          currency="GBP"
          size={size}
        />
      )
      expect(screen.getByTestId(`figure-${size}`)).toHaveClass(expected)
    }
  })

  it("merges a caller class over the variant class", () => {
    const figure = renderFigure(
      <Figure
        data-testid="figure"
        value={1020}
        currency="GBP"
        size="lg"
        className="text-[30px]"
      />
    )
    expect(figure).toHaveClass("text-[30px]")
    expect(figure).not.toHaveClass("text-[34px]")
  })

  it("forwards the remaining span props", () => {
    const figure = renderFigure(
      <Figure
        data-testid="figure"
        value={1020}
        currency="GBP"
        id="net-worth"
        title="Net worth"
      />
    )
    expect(figure).toHaveAttribute("id", "net-worth")
    expect(figure).toHaveAttribute("title", "Net worth")
  })
})

describe("Figure values", () => {
  it("renders money at two decimals", () => {
    expect(
      renderFigure(<Figure data-testid="figure" value={1020} currency="GBP" />)
    ).toHaveTextContent("£1,020.00")
  })

  it("renders units at four decimals", () => {
    const figure = renderFigure(
      <Figure data-testid="figure" value={2} kind="units" ticker="BTC" />
    )
    expect(figure.textContent).toBe(`2.0000${NBSP}BTC`)
  })

  it("renders percentages and rates", () => {
    expect(
      renderFigure(<Figure data-testid="figure" value={36.7} kind="percent" />)
    ).toHaveTextContent("36.7%")
    render(<Figure data-testid="rate" value="1.1204" kind="rate" />)
    expect(screen.getByTestId("rate")).toHaveTextContent("1.1204")
  })

  it("compacts axis figures", () => {
    expect(
      renderFigure(
        <Figure data-testid="figure" value={341000} currency="GBP" compact />
      )
    ).toHaveTextContent("£341k")
  })

  it("uses the true minus, never a hyphen", () => {
    const figure = renderFigure(
      <Figure data-testid="figure" value={-588} currency="GBP" />
    )
    expect(figure.textContent).toBe(`${MINUS}£588.00`)
    expect(figure.textContent).not.toContain("-")
  })
})

describe("Figure not-applicable state", () => {
  it("renders an em dash for null and undefined, never a zero", () => {
    const values = [null, undefined, "", Number.NaN]
    values.forEach((value, index) => {
      render(
        <Figure
          data-testid={`empty-${index}`}
          value={value}
          currency="GBP"
          intent="inflow"
        />
      )
      const figure = screen.getByTestId(`empty-${index}`)
      expect(figure.textContent).toBe(EM_DASH)
      expect(figure).toHaveClass("text-ink-3")
      expect(figure).toHaveAttribute("data-tone", "meta")
      expect(figure).not.toHaveClass("text-positive")
    })
  })

  it("renders a real zero as a zero", () => {
    expect(
      renderFigure(<Figure data-testid="figure" value={0} currency="GBP" />)
    ).toHaveTextContent("£0.00")
  })

  it("labels the em dash for assistive technology", () => {
    const figure = renderFigure(
      <Figure data-testid="figure" value={null} currency="GBP" />
    )
    expect(figure).toHaveAttribute("aria-label", "Not applicable")
  })
})

describe("Figure intent", () => {
  it("keeps everyday spending in neutral ink with a minus", () => {
    const figure = renderFigure(
      <Figure
        data-testid="figure"
        value={-42.18}
        currency="GBP"
        intent="spending"
      />
    )
    expect(figure).toHaveTextContent(`${MINUS}£42.18`)
    expect(figure).toHaveClass("text-ink")
    expect(figure).not.toHaveClass("text-negative")
  })

  it("colours money arriving positive and signs it", () => {
    const figure = renderFigure(
      <Figure
        data-testid="figure"
        value={1020}
        currency="GBP"
        intent="inflow"
      />
    )
    expect(figure).toHaveTextContent("+£1,020.00")
    expect(figure).toHaveClass("text-positive")
  })

  it("colours a gain-or-loss figure by its direction", () => {
    render(
      <Figure
        data-testid="gain"
        value={2418.9}
        currency="GBP"
        intent="gainLoss"
      />
    )
    render(
      <Figure
        data-testid="loss"
        value={-588}
        currency="GBP"
        intent="gainLoss"
      />
    )
    render(
      <Figure data-testid="flat" value={0} currency="GBP" intent="gainLoss" />
    )
    expect(screen.getByTestId("gain")).toHaveClass("text-positive")
    expect(screen.getByTestId("gain")).toHaveTextContent("+£2,418.90")
    expect(screen.getByTestId("loss")).toHaveClass("text-negative")
    expect(screen.getByTestId("loss")).toHaveTextContent(`${MINUS}£588.00`)
    expect(screen.getByTestId("flat")).toHaveClass("text-ink")
    expect(screen.getByTestId("flat")).toHaveTextContent("£0.00")
  })

  it("does not colour a gain that rounds away to zero", () => {
    const figure = renderFigure(
      <Figure
        data-testid="figure"
        value={-0.001}
        currency="GBP"
        intent="gainLoss"
      />
    )
    expect(figure).toHaveClass("text-ink")
    expect(figure).toHaveTextContent("£0.00")
  })

  it("maps the remaining intents onto their tokens", () => {
    const cases = [
      ["neutral", "text-ink"],
      ["negative", "text-negative"],
      ["secondary", "text-ink-2"],
      ["meta", "text-ink-3"],
      ["ghost", "text-ghost"],
    ] as const
    for (const [intent, expected] of cases) {
      render(
        <Figure
          data-testid={`figure-${intent}`}
          value={1020}
          currency="GBP"
          intent={intent}
        />
      )
      const figure = screen.getByTestId(`figure-${intent}`)
      expect(figure).toHaveClass(expected)
      expect(figure).toHaveAttribute("data-tone")
    }
  })

  it("resolves the tone from the intent and direction alone", () => {
    expect(resolveFigureTone("spending", -1)).toBe("neutral")
    expect(resolveFigureTone("inflow", -1)).toBe("positive")
    expect(resolveFigureTone("negative", 1)).toBe("negative")
    expect(resolveFigureTone("gainLoss", 0)).toBe("neutral")
  })
})

describe("Figure signs and arrows", () => {
  it("suppresses the sign when the caller says the direction is stated elsewhere", () => {
    const figure = renderFigure(
      <Figure
        data-testid="figure"
        value={-1240.1}
        currency="GBP"
        sign="never"
      />
    )
    expect(figure).toHaveTextContent("£1,240.10")
    expect(figure.textContent).not.toContain(MINUS)
  })

  it("refuses to leave a coloured figure without a sign", () => {
    const figure = renderFigure(
      <Figure
        data-testid="figure"
        value={1020}
        currency="GBP"
        intent="inflow"
        sign="never"
      />
    )
    expect(figure).toHaveTextContent("+£1,020.00")
  })

  it("accepts an arrow instead of a sign", () => {
    const figure = renderFigure(
      <Figure
        data-testid="figure"
        value={2418.9}
        currency="GBP"
        intent="gainLoss"
        size="delta"
        sign="never"
        arrow
      />
    )
    expect(figure.textContent).toBe(`${ARROW_UP}£2,418.90`)
    expect(figure).toHaveClass("text-positive")
  })

  it("points the arrow at the direction and hides it from assistive technology", () => {
    const figure = renderFigure(
      <Figure
        data-testid="figure"
        value={-588}
        currency="GBP"
        intent="gainLoss"
        arrow
      />
    )
    expect(figure.textContent).toBe(`${ARROW_DOWN}${MINUS}£588.00`)
    expect(figure.querySelector("[aria-hidden='true']")?.textContent).toBe(
      ARROW_DOWN
    )
  })

  it("draws no arrow for a flat figure", () => {
    const figure = renderFigure(
      <Figure
        data-testid="figure"
        value={0}
        currency="GBP"
        intent="gainLoss"
        arrow
      />
    )
    expect(figure.textContent).toBe("£0.00")
  })
})

describe("Figure never colours alone", () => {
  const INTENTS: FigureIntent[] = [
    "neutral",
    "spending",
    "inflow",
    "gainLoss",
    "negative",
    "secondary",
    "meta",
    "ghost",
  ]
  const SIGNS: (SignDisplay | undefined)[] = [
    undefined,
    "auto",
    "always",
    "never",
  ]
  const VALUES = [0, -0, 100, -100, 2418.9, -0.001]

  it("carries a sign or an arrow on every coloured figure in the matrix", () => {
    let index = 0
    for (const intent of INTENTS) {
      for (const sign of SIGNS) {
        for (const value of VALUES) {
          for (const arrow of [false, true]) {
            const id = `matrix-${(index += 1)}`
            render(
              <Figure
                data-testid={id}
                value={value}
                currency="GBP"
                intent={intent}
                sign={sign}
                arrow={arrow}
              />
            )
            const figure = screen.getByTestId(id)
            const tone = figure.getAttribute("data-tone")
            if (tone !== "positive" && tone !== "negative") continue
            const text = figure.textContent ?? ""
            const encoded =
              text.includes(MINUS) ||
              text.includes("+") ||
              text.includes(ARROW_UP) ||
              text.includes(ARROW_DOWN)
            expect(
              encoded,
              `intent=${intent} sign=${String(sign)} value=${value} arrow=${arrow} rendered "${text}" in ${tone}`
            ).toBe(true)
          }
        }
      }
    }
  })

  it("signs a coloured positive that the caller left on auto", () => {
    render(<Figure data-testid="negative" value={100} intent="negative" />)
    render(
      <Figure data-testid="gain" value={2418.9} intent="gainLoss" sign="auto" />
    )
    expect(screen.getByTestId("negative")).toHaveTextContent("+£100.00")
    expect(screen.getByTestId("negative")).toHaveAttribute(
      "data-tone",
      "negative"
    )
    expect(screen.getByTestId("gain")).toHaveTextContent("+£2,418.90")
  })

  it("drops the colour when there is no direction left to encode", () => {
    render(<Figure data-testid="zero" value={0} intent="negative" arrow />)
    render(<Figure data-testid="inflow" value={0} intent="inflow" />)
    render(<Figure data-testid="rounded" value={-0.001} intent="inflow" />)
    for (const id of ["zero", "inflow", "rounded"]) {
      expect(screen.getByTestId(id)).toHaveAttribute("data-tone", "neutral")
      expect(screen.getByTestId(id)).toHaveTextContent("£0.00")
      expect(screen.getByTestId(id)).toHaveClass("text-ink")
    }
  })

  it("lets an arrow stand in for the sign, but only when it is drawn", () => {
    render(
      <Figure
        data-testid="arrowed"
        value={2418.9}
        intent="gainLoss"
        sign="never"
        arrow
      />
    )
    expect(screen.getByTestId("arrowed").textContent).toBe(
      `${ARROW_UP}£2,418.90`
    )
  })
})

describe("Figure money currency", () => {
  it("falls back to the session base currency", () => {
    session.baseCurrency = "USD"
    expect(
      renderFigure(<Figure data-testid="figure" value={1020} />)
    ).toHaveTextContent("$1,020.00")
  })

  it("prefers an explicit currency over the base one", () => {
    session.baseCurrency = "USD"
    expect(
      renderFigure(<Figure data-testid="figure" value={1020} currency="EUR" />)
    ).toHaveTextContent("€1,020.00")
  })

  it("refuses to render money it cannot label", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    session.baseCurrency = null
    expect(() => render(<Figure value={1020} />)).toThrow(
      MISSING_MONEY_CURRENCY
    )
    expect(() => render(<Figure value={1020} currency="" />)).toThrow(
      MISSING_MONEY_CURRENCY
    )
    expect(() => render(<Figure value={1020} currency="  " />)).toThrow(
      MISSING_MONEY_CURRENCY
    )
  })

  it("reads the session only for a money figure that omits the currency", () => {
    render(<Figure data-testid="explicit" value={1020} currency="GBP" />)
    render(<Figure data-testid="percent" value={36.7} kind="percent" />)
    render(<Figure data-testid="units" value={2} kind="units" ticker="BTC" />)
    render(<Figure data-testid="empty" value={null} />)
    expect(session.reads).toBe(0)
    render(<Figure data-testid="base" value={1020} />)
    expect(session.reads).toBe(1)
  })

  it("still renders the not-applicable dash with no currency anywhere", () => {
    session.baseCurrency = null
    expect(
      renderFigure(<Figure data-testid="figure" value={null} />)
    ).toHaveTextContent(EM_DASH)
  })

  it("needs no currency for the kinds that are not money", () => {
    session.baseCurrency = null
    render(<Figure data-testid="units" value={2} kind="units" ticker="BTC" />)
    render(<Figure data-testid="percent" value={36.7} kind="percent" />)
    render(<Figure data-testid="rate" value="1.1204" kind="rate" />)
    render(<Figure data-testid="plain" value={31} kind="plain" />)
    expect(screen.getByTestId("units").textContent).toBe(`2.0000${NBSP}BTC`)
    expect(screen.getByTestId("percent")).toHaveTextContent("36.7%")
    expect(screen.getByTestId("rate")).toHaveTextContent("1.1204")
    expect(screen.getByTestId("plain")).toHaveTextContent("31")
  })
})
