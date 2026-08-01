import { useEffect, useImperativeHandle, useRef } from "react"
import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useShellWidth, type ShellWidth } from "@/components/layout/breakpoints"

import { focusRing } from "./focus-ring"
import {
  bandSpanMismatch,
  resolveColumnLayout,
  rowArityMismatch,
  rowOutsideTableMessage,
  type DataTableColumns,
  type Responsive,
} from "./table-columns"

const GRID = "grid grid-cols-[var(--dt-cols)] gap-[var(--dt-gap)] items-center"

const TABLE_SELECTOR = '[data-slot="data-table"]'

type GridArity = {
  width: ShellWidth
  template: string
  label: string | undefined
}

function report(message: string): void {
  if (import.meta.env.DEV) throw new Error(message)
  console.error(message)
}

/**
 * Both operands are read out of the one committed DOM: a cell count held against a template
 * from another render pass would accuse a screen of an arity bug it does not have.
 */
function arityOf(table: HTMLElement): GridArity {
  return {
    width: table.dataset.shellWidth as ShellWidth,
    template: table.style.getPropertyValue("--dt-cols"),
    label: table.getAttribute("aria-label") ?? undefined,
  }
}

function useGridRowRef(
  slot: string,
  forwarded: React.Ref<HTMLTableRowElement> | undefined
) {
  const row = useRef<HTMLTableRowElement | null>(null)

  useEffect(() => {
    const node = row.current
    if (node === null) return
    if (node.closest(TABLE_SELECTOR) === null)
      report(rowOutsideTableMessage(slot))
  })

  useImperativeHandle(forwarded, () => row.current as HTMLTableRowElement, [])

  return row
}

function slotOf(row: HTMLTableRowElement): string {
  if (row.closest("thead") !== null) return "header row"
  return row.dataset.variant === "totals" ? "totals row" : "row"
}

/**
 * Sweeping every row from the table is what holds a row that did not re-render to a template
 * that did — and a row that spans the grid escapes the cell count, so its aria-colspan is the
 * only thing tying it to the template.
 */
function useGridAudit() {
  const table = useRef<HTMLTableElement | null>(null)

  useEffect(() => {
    const node = table.current
    if (node === null) return
    const arity = arityOf(node)
    for (const row of node.querySelectorAll("tr")) {
      if (row.closest(TABLE_SELECTOR) !== node) continue
      const spanned = row.querySelector("[aria-colspan]")
      const message =
        spanned === null
          ? rowArityMismatch({
              ...arity,
              slot: slotOf(row),
              cells: row.childElementCount,
            })
          : bandSpanMismatch({
              ...arity,
              span: Number(spanned.getAttribute("aria-colspan")),
              cells: spanned.parentElement?.childElementCount ?? 1,
            })
      if (message !== null) report(message)
    }
  })

  return table
}

const COMPACT_TOP_BAR_HEIGHT = 52

function stickyOffsetFor(width: ShellWidth): number {
  return width === "phone" || width === "stacked" ? COMPACT_TOP_BAR_HEIGHT : 0
}

export function DataTable({
  columns,
  gap = 14,
  padding = 18,
  headerHeight = 33,
  className,
  style,
  ...props
}: React.ComponentProps<"table"> & {
  columns: DataTableColumns
  gap?: Responsive<number>
  padding?: Responsive<number>
  headerHeight?: number
}) {
  const width = useShellWidth()
  const layout = resolveColumnLayout(columns, gap, padding)[width]
  const tableRef = useGridAudit()

  return (
    <Table
      ref={tableRef}
      data-slot="data-table"
      data-shell-width={width}
      className={cn("grid w-full text-[13px]", className)}
      style={
        {
          "--dt-cols": layout.template,
          "--dt-gap": `${layout.gap}px`,
          "--dt-pad": `${layout.padding}px`,
          "--dt-head-h": `${headerHeight}px`,
          "--dt-head-top": `${stickyOffsetFor(width)}px`,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export function DataTableHead({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <TableHeader
      className={cn("sticky top-[var(--dt-head-top,0px)] z-20 grid", className)}
      {...props}
    />
  )
}

export function DataTableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return <TableBody className={cn("grid", className)} {...props} />
}

export function DataTableHeaderRow({
  className,
  ref,
  ...props
}: React.ComponentProps<"tr">) {
  const rowRef = useGridRowRef("header row", ref)
  return (
    <TableRow
      ref={rowRef}
      className={cn(
        GRID,
        "border-b border-border bg-surface-2 px-[var(--dt-pad)] py-[9px]",
        className
      )}
      {...props}
    />
  )
}

export function DataTableHeaderCell({
  numeric = false,
  className,
  ...props
}: React.ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <TableHead
      className={cn(
        "h-auto min-w-0 truncate p-0 text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase",
        numeric ? "text-right" : "text-left",
        className
      )}
      {...props}
    />
  )
}

const rowVariants = cva(cn(GRID, "border-b border-border px-[var(--dt-pad)]"), {
  variants: {
    size: {
      table: "h-[46px]",
      compact: "h-[44px]",
      financial: "h-[48px]",
      "two-line": "h-[52px]",
      child: "h-[40px]",
      "child-compact": "h-[38px]",
    },
    variant: {
      default: "",
      ghost: "border-l-2 border-l-ghost-dim bg-ghost-dim",
      group: "bg-surface-2",
      child: "bg-surface-2",
      totals: "bg-surface-2",
    },
  },
  defaultVariants: { size: "table", variant: "default" },
})

export function DataRow({
  size,
  variant,
  interactive = false,
  className,
  ref,
  ...props
}: React.ComponentProps<"tr"> &
  VariantProps<typeof rowVariants> & { interactive?: boolean }) {
  const rowRef = useGridRowRef(variant === "totals" ? "totals row" : "row", ref)
  return (
    <TableRow
      ref={rowRef}
      data-slot="data-row"
      data-variant={variant ?? "default"}
      className={cn(
        rowVariants({ size, variant }),
        interactive &&
          cn(
            "cursor-pointer transition-colors duration-instant ease-out-quick outline-none hover:bg-surface-2",
            focusRing.row
          ),
        className
      )}
      {...props}
    />
  )
}

export function DataCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <TableCell
      className={cn("min-w-0 truncate p-0 align-middle", className)}
      {...props}
    />
  )
}

export function FigureCell({
  className,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <TableCell
      data-figure=""
      className={cn(
        "p-0 text-right align-middle font-mono whitespace-nowrap tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export function GlyphCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <TableCell
      className={cn(
        "p-0 text-center align-middle font-mono text-[12px] leading-none font-medium text-ink-3",
        className
      )}
      {...props}
    />
  )
}

export function DayBandRow({
  label,
  date,
  net,
  span,
  className,
  ...props
}: Omit<React.ComponentProps<"tr">, "children"> & {
  label: React.ReactNode
  date?: React.ReactNode
  net?: React.ReactNode
  span: number
}) {
  return (
    <TableRow
      data-slot="day-band"
      className={cn(
        "sticky top-[calc(var(--dt-head-top,0px)+var(--dt-head-h))] z-10 block border-b border-border bg-background",
        className
      )}
      {...props}
    >
      <TableCell
        aria-colspan={span}
        className="flex items-center gap-[10px] px-[var(--dt-pad)] py-[8px]"
      >
        <span className="text-[10px] leading-none font-semibold tracking-[0.1em] text-ink uppercase">
          {label}
        </span>
        {date ? (
          <span className="font-mono text-[10px] leading-none font-medium text-ink-3">
            {date}
          </span>
        ) : null}
        {net ? (
          <span
            data-figure=""
            className="ms-auto font-mono text-[10.5px] leading-none font-medium whitespace-nowrap text-ink-3 tabular-nums"
          >
            {net}
          </span>
        ) : null}
      </TableCell>
    </TableRow>
  )
}
