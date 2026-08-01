import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"

import { Truncate } from "./truncate"

const LONG = "Sainsbury's Superstore, Whitechapel Road, London E1"

let widths = {
  scrollWidth: 0,
  clientWidth: 0,
  scrollHeight: 0,
  clientHeight: 0,
}

function measureAs(next: Partial<typeof widths>) {
  widths = { ...widths, ...next }
}

for (const key of [
  "scrollWidth",
  "clientWidth",
  "scrollHeight",
  "clientHeight",
] as const) {
  Object.defineProperty(HTMLElement.prototype, key, {
    configurable: true,
    get() {
      return widths[key]
    },
  })
}

afterEach(() => {
  widths = { scrollWidth: 0, clientWidth: 0, scrollHeight: 0, clientHeight: 0 }
})

async function findTooltip() {
  return await screen.findByText(LONG, {
    selector: '[data-slot="tooltip-content"]',
  })
}

function paint(ui: React.ReactNode) {
  return render(<TooltipProvider delay={0}>{ui}</TooltipProvider>)
}

describe("Truncate", () => {
  it("stays an inert span while the text fits", () => {
    measureAs({ scrollWidth: 120, clientWidth: 120 })
    paint(<Truncate text="Lidl" />)

    const label = screen.getByText("Lidl")
    expect(label).not.toHaveAttribute("data-clipped")
    expect(label).not.toHaveAttribute("tabindex")
    expect(label.className).toContain("truncate")
  })

  it("reveals the full value on hover once the text is clipped", async () => {
    const user = userEvent.setup()
    measureAs({ scrollWidth: 400, clientWidth: 120 })
    paint(<Truncate text={LONG} />)

    const label = screen.getByText(LONG)
    expect(label).toHaveAttribute("data-clipped", "true")

    await user.hover(label)
    expect(await findTooltip()).toHaveTextContent(LONG)
  })

  it("takes a tab stop and opens on keyboard focus when nothing else can reveal it", async () => {
    const user = userEvent.setup()
    measureAs({ scrollWidth: 400, clientWidth: 120 })
    paint(<Truncate text={LONG} />)

    await user.tab()

    expect(
      screen.getByText(LONG, { selector: '[data-slot="truncate"]' })
    ).toHaveFocus()
    expect(await findTooltip()).toHaveTextContent(LONG)
  })

  it("adds no second tab stop inside a row that already opens the record", () => {
    measureAs({ scrollWidth: 400, clientWidth: 120 })
    paint(
      <button type="button">
        <Truncate text={LONG} />
      </button>
    )

    expect(screen.getByText(LONG)).not.toHaveAttribute("tabindex")
  })

  it("measures height, not width, when it clamps to several lines", async () => {
    const user = userEvent.setup()
    measureAs({
      scrollWidth: 120,
      clientWidth: 120,
      scrollHeight: 80,
      clientHeight: 40,
    })
    paint(<Truncate text={LONG} lines={2} />)

    const label = screen.getByText(LONG)
    expect(label.className).toContain("line-clamp-2")
    expect(label).toHaveAttribute("data-clipped", "true")

    await user.hover(label)
    expect(await findTooltip()).toHaveTextContent(LONG)
  })

  it("reads its own rendered text when the line is composed of several parts", async () => {
    const user = userEvent.setup()
    measureAs({ scrollWidth: 400, clientWidth: 120 })
    paint(
      <Truncate>
        <span>3.7879 VWRP.LSE</span>
        {" left · cost "}
        <span>£500.00</span>
      </Truncate>
    )

    await user.hover(screen.getByText("3.7879 VWRP.LSE"))

    expect(
      await screen.findByText("3.7879 VWRP.LSE left · cost £500.00", {
        selector: '[data-slot="tooltip-content"]',
      })
    ).toBeVisible()
  })

  it("keeps the full text in the accessible tree, tooltip or not", () => {
    measureAs({ scrollWidth: 400, clientWidth: 120 })
    paint(
      <Truncate text={LONG}>
        <span>{LONG}</span>
      </Truncate>
    )

    expect(screen.getAllByText(LONG).length).toBeGreaterThan(0)
  })
})
