import { Sparkle } from "lucide-react"

import { useShellWidth } from "@/components/layout/breakpoints"
import {
  DataCell,
  DataRow,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
  DataTableHeaderRow,
  FigureCell,
  GlyphCell,
  TableFoldRow,
  Truncate,
} from "@/components/primitives"

import type { ReviewItem } from "./api"
import { QUEUE_COLUMNS, QUEUE_ROWS_DRAWN, queueCellCount } from "./presentation"
import { ReviewAmount } from "./review-figure"

function QueueMeta({ item }: { item: ReviewItem }) {
  return (
    <Truncate
      text={`${item.queueSourceLabel} · ${item.queueHint}`}
      className="block text-[11px] leading-[1.45] text-ink-3"
    />
  )
}

export function ReviewQueueList({
  items,
  onSelect,
  onShowAll,
}: {
  items: readonly ReviewItem[]
  onSelect: (item: ReviewItem) => void
  onShowAll: () => void
}) {
  const width = useShellWidth()
  const drawn = Math.min(items.length, QUEUE_ROWS_DRAWN[width])
  const visible = items.slice(0, drawn)
  const cells = queueCellCount(width)
  const twoLine = width === "stacked" || width === "phone"

  return (
    <DataTable columns={QUEUE_COLUMNS} aria-label="Up next in the review queue">
      <DataTableHead>
        <DataTableHeaderRow>
          {width === "phone" ? null : <DataTableHeaderCell />}
          <DataTableHeaderCell>Waiting</DataTableHeaderCell>
          {width === "full" || width === "tight" ? (
            <DataTableHeaderCell>Source</DataTableHeaderCell>
          ) : null}
          {width === "full" ? (
            <DataTableHeaderCell>Why</DataTableHeaderCell>
          ) : null}
          <DataTableHeaderCell numeric>Amount</DataTableHeaderCell>
        </DataTableHeaderRow>
      </DataTableHead>
      <DataTableBody>
        {visible.map((item) => (
          <DataRow
            key={item.id}
            interactive
            variant="ghost"
            size={twoLine ? "two-line" : "compact"}
            tabIndex={0}
            onClick={() => {
              onSelect(item)
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return
              event.preventDefault()
              onSelect(item)
            }}
          >
            {width === "phone" ? null : <GlyphCell>{item.glyph}</GlyphCell>}
            <DataCell>
              <Truncate
                text={item.title}
                className="block text-[12.5px] leading-[1.3] font-medium text-ghost"
              />
              {twoLine ? <QueueMeta item={item} /> : null}
            </DataCell>
            {width === "full" || width === "tight" ? (
              <DataCell className="text-[11.5px] leading-none text-ink-3">
                {item.queueSourceLabel}
              </DataCell>
            ) : null}
            {width === "full" ? (
              <DataCell className="text-[11.5px] leading-none text-ink-3">
                {item.queueHint}
              </DataCell>
            ) : null}
            <FigureCell>
              <ReviewAmount figure={item.figure} className="text-ghost" />
            </FigureCell>
          </DataRow>
        ))}
        <TableFoldRow
          total={items.length}
          shown={drawn}
          mode="remainder"
          span={cells}
          onShowAll={onShowAll}
        />
      </DataTableBody>
    </DataTable>
  )
}

export function ReviewQueueNote({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-slot="review-queue-note"
      className="flex items-start gap-[9px] text-pretty"
    >
      <Sparkle
        aria-hidden
        className="mt-px size-3 flex-none stroke-attention"
      />
      {children}
    </span>
  )
}
