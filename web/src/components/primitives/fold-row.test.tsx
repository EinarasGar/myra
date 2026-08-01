import type * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FoldRow, TableFoldRow } from "./fold-row"
import { DataTable, DataTableBody } from "./data-table"

function renderTableFold(props: React.ComponentProps<typeof TableFoldRow>) {
  return render(
    <DataTable columns="1fr">
      <DataTableBody>
        <TableFoldRow {...props} />
      </DataTableBody>
    </DataTable>
  )
}

describe("TableFoldRow", () => {
  it("stays silent only when nothing is hidden", () => {
    renderTableFold({ total: 5, shown: 5, span: 1 })
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("names the full count when rows are hidden", () => {
    renderTableFold({ total: 31, shown: 5, span: 1 })
    expect(
      screen.getByRole("button", { name: "Show all 31 →" })
    ).toBeInTheDocument()
  })

  it("counts the remainder in remainder mode", () => {
    renderTableFold({ total: 8, shown: 5, span: 1, mode: "remainder" })
    expect(screen.getByRole("button", { name: "+3 more" })).toBeInTheDocument()
  })

  it("calls onShowAll", async () => {
    const onShowAll = vi.fn()
    renderTableFold({ total: 8, shown: 5, span: 1, onShowAll })
    await userEvent.click(screen.getByRole("button"))
    expect(onShowAll).toHaveBeenCalledOnce()
  })
})

describe("FoldRow", () => {
  it("stays silent only when nothing is hidden", () => {
    const { container } = render(<FoldRow total={3} shown={3} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the caller's label, the hidden names and a Show action", () => {
    render(
      <FoldRow
        total={4}
        shown={0}
        label="4 deactivated accounts"
        names="Old ISA, Halifax Current"
      />
    )
    expect(screen.getByText("4 deactivated accounts")).toBeInTheDocument()
    expect(screen.getByText("Old ISA, Halifax Current")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Show" })).toBeInTheDocument()
  })

  it("derives a label when the caller gives none", () => {
    render(<FoldRow total={12} shown={4} />)
    expect(screen.getByText("Show all 12 →")).toBeInTheDocument()
  })
})
