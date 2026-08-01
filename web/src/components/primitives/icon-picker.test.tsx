import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { IconPicker } from "./icon-picker"
import {
  CURATED_ICON_COUNT,
  ICON_PICKER_EMPTY,
  ICON_PICKER_PLACEHOLDER,
  ICON_SEARCH_LIMIT,
  iconGlyph,
  iconStatusLine,
  searchIcons,
} from "./icon-picker-options"

function Harness({
  initial = null,
  clearable = false,
}: {
  initial?: string | null
  clearable?: boolean
}) {
  const [value, setValue] = useState<string | null>(initial)
  return (
    <IconPicker
      label="Icon"
      value={value}
      clearable={clearable}
      onValueChange={setValue}
    />
  )
}

function trigger() {
  return screen.getByRole("button", { name: "Icon" })
}

function searchField() {
  return screen.getByRole("combobox")
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger())
  await screen.findByRole("listbox")
}

describe("the icon list", () => {
  it("matches a curated icon by what the group is for, not only its name", () => {
    const names = searchIcons("groceries").icons.map((icon) => icon.name)
    expect(names).toContain("shopping-cart")
    expect(names).toContain("utensils")
  })

  it("reaches an icon outside the curated set by name", () => {
    const names = searchIcons("microscope").icons.map((icon) => icon.name)
    expect(names).toContain("microscope")
  })

  it("puts curated icons first, because those render without a round trip", () => {
    const { icons } = searchIcons("car")
    expect(icons[0]?.name).toBe("car")
    expect(typeof icons[0]?.icon).not.toBe("string")
  })

  it("caps a wide search and says how much it is holding back", () => {
    const wide = searchIcons("a")
    expect(wide.icons).toHaveLength(ICON_SEARCH_LIMIT)
    expect(wide.total).toBeGreaterThan(ICON_SEARCH_LIMIT)
    expect(iconStatusLine(wide.icons.length, wide.total)).toContain(
      `Showing ${String(ICON_SEARCH_LIMIT)} of ${String(wide.total)} matches`
    )
  })

  it("hands a curated name its bundled component and any other name back as a string", () => {
    expect(typeof iconGlyph("wallet")).not.toBe("string")
    expect(iconGlyph("microscope")).toBe("microscope")
    expect(iconGlyph("money_off")).toBe("money_off")
  })

  it("counts every match when the list is short enough to show whole", () => {
    expect(iconStatusLine(1, 1)).toBe("1 match")
    expect(iconStatusLine(4, 4)).toBe("4 matches")
  })
})

describe("choosing an icon", () => {
  it("offers a browsable grid rather than asking for a name", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(trigger()).toHaveTextContent(ICON_PICKER_PLACEHOLDER)

    await open(user)
    expect(screen.getByText("Money")).toBeInTheDocument()
    expect(screen.getByText("Food & drink")).toBeInTheDocument()
    expect(screen.getAllByRole("option")).toHaveLength(CURATED_ICON_COUNT)
  })

  it("puts the caret in the search field so typing narrows straight away", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    expect(trigger()).toHaveFocus()

    await user.keyboard("{Enter}")
    await screen.findByRole("listbox")
    expect(searchField()).toHaveFocus()

    await user.keyboard("coffee")
    expect(screen.getAllByRole("option")).toHaveLength(1)
    expect(screen.getByRole("option", { name: "coffee" })).toBeInTheDocument()
  })

  it("commits the highlighted icon on Enter", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await open(user)

    await user.keyboard("{ArrowRight}{Enter}")
    expect(trigger()).toHaveTextContent("banknote")
    expect(screen.queryByRole("listbox")).toBeNull()
  })

  it("moves a whole row at a time on ArrowDown", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await open(user)

    await user.keyboard("{ArrowDown}{Enter}")
    expect(trigger()).toHaveTextContent("credit-card")
  })

  it("selects with a click and shows what is chosen", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await open(user)

    await user.click(screen.getByRole("option", { name: "fuel" }))
    expect(trigger()).toHaveTextContent("fuel")

    await open(user)
    expect(screen.getByRole("option", { name: "fuel" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
  })

  it("starts on the icon already chosen rather than at the top", async () => {
    const user = userEvent.setup()
    render(<Harness initial="fuel" />)
    await open(user)

    expect(searchField()).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "fuel" }).id
    )
  })

  it("says nothing matches rather than showing an empty grid", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await open(user)

    await user.keyboard("zzzzz")
    expect(screen.getByText(ICON_PICKER_EMPTY)).toBeInTheDocument()
    expect(screen.queryByRole("listbox")).toBeNull()
  })

  it("clears only when the field is one you are allowed to empty", async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Harness initial="fuel" />)
    expect(screen.queryByRole("button", { name: "Clear icon" })).toBeNull()
    unmount()

    render(<Harness initial="fuel" clearable />)
    await user.click(screen.getByRole("button", { name: "Clear icon" }))
    expect(trigger()).toHaveTextContent(ICON_PICKER_PLACEHOLDER)
    expect(screen.queryByRole("button", { name: "Clear icon" })).toBeNull()
  })
})
