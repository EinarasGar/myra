import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { EM_DASH, MISSING_MONEY_CURRENCY, NBSP } from "@/lib/format"

import { FigureBaseCurrencyProvider } from "./base-currency"
import { Figure } from "./figure"

function withBaseCurrency(currency: string | null, children: ReactNode) {
  return render(
    <FigureBaseCurrencyProvider currency={currency}>
      {children}
    </FigureBaseCurrencyProvider>
  )
}

describe("Figure base currency provider", () => {
  it("labels a bare money figure with the provided currency", () => {
    withBaseCurrency("USD", <Figure data-testid="figure" value={1020} />)
    expect(screen.getByTestId("figure")).toHaveTextContent("$1,020.00")
  })

  it("prefers an explicit currency over the provided one", () => {
    withBaseCurrency(
      "USD",
      <Figure data-testid="figure" value={1020} currency="EUR" />
    )
    expect(screen.getByTestId("figure")).toHaveTextContent("€1,020.00")
  })

  it("refuses to render money the provider cannot label", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => withBaseCurrency(null, <Figure value={1020} />)).toThrow(
      MISSING_MONEY_CURRENCY
    )
  })
})

describe("Figure with no base currency provider", () => {
  it("renders money that carries its own currency", () => {
    render(<Figure data-testid="figure" value={1020} currency="GBP" />)
    expect(screen.getByTestId("figure")).toHaveTextContent("£1,020.00")
  })

  it("refuses to render money it cannot label", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<Figure value={1020} />)).toThrow(
      MISSING_MONEY_CURRENCY
    )
  })

  it("renders every other kind, and the not-applicable dash", () => {
    render(<Figure data-testid="units" value={2} kind="units" ticker="BTC" />)
    render(<Figure data-testid="percent" value={36.7} kind="percent" />)
    render(<Figure data-testid="rate" value="1.1204" kind="rate" />)
    render(<Figure data-testid="plain" value={31} kind="plain" />)
    render(<Figure data-testid="empty" value={null} />)
    expect(screen.getByTestId("units").textContent).toBe(`2.0000${NBSP}BTC`)
    expect(screen.getByTestId("percent")).toHaveTextContent("36.7%")
    expect(screen.getByTestId("rate")).toHaveTextContent("1.1204")
    expect(screen.getByTestId("plain")).toHaveTextContent("31")
    expect(screen.getByTestId("empty").textContent).toBe(EM_DASH)
  })
})
