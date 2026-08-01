import { useState } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EntityPicker } from "./entity-picker"
import { pickerOptionMatches, type PickerOption } from "./entity-picker-options"

const ACCOUNTS: readonly PickerOption[] = [
  { value: "a", label: "Lloyds Current", subLabel: "Current", group: "Cash" },
  { value: "b", label: "Marcus Savings", subLabel: "Savings", group: "Cash" },
  {
    value: "c",
    label: "Trading 212 ISA",
    subLabel: "Investment",
    group: "Investments",
  },
]

function Harness({
  onChange,
  options = ACCOUNTS,
  initial = null,
}: {
  onChange?: (next: string | null) => void
  options?: readonly PickerOption[]
  initial?: string | null
}) {
  const [value, setValue] = useState<string | null>(initial)
  return (
    <EntityPicker
      label="Account"
      placeholder="Select an account"
      value={value}
      options={options}
      onValueChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

function input() {
  return screen.getByRole("combobox", { name: "Account" })
}

describe("matching", () => {
  const option: PickerOption = {
    value: "1",
    label: "AAPL.NASDAQ",
    subLabel: "Apple Inc",
    keywords: ["Apple Inc"],
  }

  it("matches the name a user knows, not only the ticker", () => {
    expect(pickerOptionMatches(option, "apple")).toBe(true)
    expect(pickerOptionMatches(option, "aapl")).toBe(true)
    expect(pickerOptionMatches(option, "tesla")).toBe(false)
  })

  it("requires every typed word, so two words narrow rather than widen", () => {
    expect(pickerOptionMatches(option, "apple nasdaq")).toBe(true)
    expect(pickerOptionMatches(option, "apple london")).toBe(false)
  })
})

describe("a known list", () => {
  it("keeps its groups and announces how many options there are", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(input())

    expect(await screen.findByText("Cash")).toBeInTheDocument()
    expect(screen.getByText("Investments")).toBeInTheDocument()
    expect(
      document.querySelector("[data-slot=entity-picker-status]")
    ).toHaveTextContent("3 matches")
  })

  it("narrows as you type and commits the highlighted row on Enter", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(input())
    await user.keyboard("trading")

    expect(
      document.querySelector("[data-slot=entity-picker-status]")
    ).toHaveTextContent("1 match")

    await user.keyboard("{Enter}")
    expect(onChange).toHaveBeenCalledWith("c")
    expect(input()).toHaveValue("Trading 212 ISA")
  })

  it("says so rather than showing an empty list", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(input())
    await user.keyboard("zzzz")

    expect(await screen.findByText("Nothing matches that.")).toBeInTheDocument()
  })

  it("offers a clear only once something is chosen", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} initial="a" />)

    const clear = screen.getByRole("button", { name: "Clear" })
    await user.click(clear)

    expect(onChange).toHaveBeenCalledWith(null)
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
  })

  it("shows the current value even when the list is long", async () => {
    render(<Harness initial="c" />)
    expect(input()).toHaveValue("Trading 212 ISA")
  })

  it("draws an option as icon then label, both packed to the left", async () => {
    const user = userEvent.setup()
    render(
      <Harness
        options={[
          { value: "g", label: "Groceries", icon: "shopping-cart" },
          { value: "c", label: "Cafes & Coffee", icon: "coffee" },
        ]}
      />
    )
    await user.click(input())

    const row = (await screen.findByText("Groceries")).closest(
      "[data-slot=combobox-item]"
    )
    await waitFor(() => {
      expect(row?.querySelector("svg")).not.toBeNull()
    })

    const parts = [...(row?.children ?? [])]
    expect(parts[0]?.tagName).toBe("svg")
    expect(parts[1]).toHaveTextContent("Groceries")
    // mx-auto on a flex item eats the free space and pushes the label to the far edge.
    expect(parts[0]?.getAttribute("class")).not.toContain("mx-auto")
    expect(parts[0]?.getAttribute("class")).toContain("flex-none")
  })

  it("reaches the list from the keyboard alone", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.tab()
    expect(input()).toHaveFocus()
    await user.keyboard("{ArrowDown}")
    expect(await screen.findByText("Lloyds Current")).toBeInTheDocument()
    await user.keyboard("{ArrowDown}{Enter}")

    expect(onChange).toHaveBeenCalledWith("b")
  })
})

describe("an async source", () => {
  function AsyncHarness({ onLoadMore }: { onLoadMore: () => void }) {
    const [query, setQuery] = useState("")
    return (
      <EntityPicker
        label="Asset"
        placeholder="Search assets…"
        value={null}
        options={[
          { value: "1", label: "AAPL.NASDAQ", subLabel: "Apple Inc" },
          { value: "2", label: "APC.BE", subLabel: "Apple Inc" },
        ]}
        onValueChange={() => {}}
        search={{
          query,
          onQueryChange: setQuery,
          pending: false,
          hasMore: true,
          onLoadMore,
          total: 27,
        }}
      />
    )
  }

  it("names the page against the whole result set and offers the rest", async () => {
    const user = userEvent.setup()
    const onLoadMore = vi.fn()
    render(<AsyncHarness onLoadMore={onLoadMore} />)

    await user.click(screen.getByRole("combobox", { name: "Asset" }))

    expect(
      document.querySelector("[data-slot=entity-picker-status]")
    ).toHaveTextContent("Showing 2 of 27 matches")

    await user.click(screen.getByRole("button", { name: "Load more" }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it("does not filter a second time over what the server already matched", async () => {
    const user = userEvent.setup()
    render(<AsyncHarness onLoadMore={() => {}} />)

    await user.click(screen.getByRole("combobox", { name: "Asset" }))
    await user.keyboard("zzz")

    expect(screen.getByText("AAPL.NASDAQ")).toBeInTheDocument()
    expect(screen.getByText("APC.BE")).toBeInTheDocument()
  })

  it("renders an asset as its ticker and its name, never the ticker twice", async () => {
    const user = userEvent.setup()
    render(<AsyncHarness onLoadMore={() => {}} />)

    await user.click(screen.getByRole("combobox", { name: "Asset" }))
    const row = screen
      .getByText("AAPL.NASDAQ")
      .closest("[data-slot=combobox-item]")

    expect(row).toHaveTextContent("AAPL.NASDAQ")
    expect(row).toHaveTextContent("Apple Inc")
  })
})
