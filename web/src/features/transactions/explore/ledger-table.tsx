import { useMemo } from "react"
import type { KeyboardEvent, ReactNode } from "react"

import { ShareBar } from "@/components/chart"
import { Figure, type FigureIntent } from "@/components/figure"
import {
  ChildSeam,
  CountChip,
  DataCell,
  DataRow,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
  DataTableHeaderRow,
  DayBandRow,
  DisclosureCaret,
  EntityMarkGroup,
  FigureCell,
  focusRing,
  GlyphCell,
  HIT_TARGET,
  InfiniteLoadFooter,
  InlineRowAction,
  rowActivation,
  RowGlyph,
  StatusChip,
  Truncate,
} from "@/components/primitives"
import { Checkbox } from "@/components/ui/checkbox"
import type { AccountRef, Category } from "@/lib/domain/refs"
import { accountLabel } from "@/lib/domain/refs"
import {
  getTransactionTypeConfig,
  transactionFlowTone,
} from "@/lib/domain/transaction-types"
import { EM_DASH, formatDateStamp } from "@/lib/format"
import type { TransactionGroupId, TransactionId } from "@/lib/query"
import { cn } from "@/lib/utils"

import type {
  LedgerGroupRow,
  LedgerRow,
  LedgerTransactionRow,
  NativeAmount,
} from "../api"
import { assetUnitsOf, isGroupRow, nativeFigureProps } from "../api"

import { NO_CATEGORY_TITLE } from "./copy"
import type { PivotGroup, PivotResult } from "./pivot"
import type { LedgerColumns } from "./presentation"
import {
  DAY_NET_FIGURE_LIMIT,
  LEDGER_COLUMNS,
  LEDGER_GAP,
  LEDGER_PADDING,
  ledgerCellCount,
  ledgerChildSize,
  ledgerRowSize,
} from "./presentation"
import type { LedgerSelection } from "./selection"

export type CategoryNameResolver = (category: Category) => string

function activationProps(activate: () => void) {
  return {
    interactive: true,
    ...rowActivation<HTMLTableRowElement>(activate),
  }
}

function amountIntent(intent: FigureIntent, units: number): FigureIntent {
  if (intent === "inflow" && units < 0) return "neutral"
  if (intent === "negative" && units > 0) return "neutral"
  return intent
}

function AmountStack({
  amounts,
  intent,
  size = "base",
}: {
  amounts: readonly NativeAmount[]
  intent: FigureIntent
  size?: "base" | "micro"
}) {
  if (amounts.length === 0) return <Figure value={null} size={size} />

  const shown = amounts.slice(0, DAY_NET_FIGURE_LIMIT)
  return (
    <span className="flex flex-col items-end gap-[2px]">
      {shown.map((amount, index) => (
        <Figure
          key={`${String(amount.asset.assetId)}-${String(index)}`}
          {...nativeFigureProps(amount)}
          intent={amountIntent(intent, assetUnitsOf(amount))}
          size={index === 0 ? size : "micro"}
        />
      ))}
      {amounts.length > shown.length ? (
        <span className="text-[10px] leading-none text-ink-3">
          +{amounts.length - shown.length} more
        </span>
      ) : null}
    </span>
  )
}

function RowCheckbox({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <Checkbox
      aria-label={label}
      checked={checked}
      onCheckedChange={onToggle}
      className="mx-0"
    />
  )
}

function TypeGlyph({
  row,
  categoryName,
}: {
  row: LedgerTransactionRow
  categoryName: CategoryNameResolver
}) {
  const config = getTransactionTypeConfig(row.type)
  const units =
    row.primaryAmount === null ? null : assetUnitsOf(row.primaryAmount)
  const category = row.category
  return (
    <RowGlyph
      icon={category === null ? config.icon : category.icon}
      label={
        category === null
          ? config.name
          : `${categoryName(category)} · ${config.name}`
      }
      tone={transactionFlowTone(row.type, units)}
      muted={row.isUnreviewed}
    />
  )
}

function metaLine(row: LedgerRow, categoryName: CategoryNameResolver): string {
  const account = isGroupRow(row) ? (row.accounts[0] ?? null) : row.account
  return [
    formatDateStamp(row.date),
    account === null ? "" : accountLabel(account),
    row.category === null ? "" : categoryName(row.category),
  ]
    .filter(Boolean)
    .join(" · ")
}

function Description({
  row,
  columns,
  categoryName,
  emphasis = false,
  trailing,
}: {
  row: LedgerRow
  columns: LedgerColumns
  categoryName: CategoryNameResolver
  emphasis?: boolean
  trailing?: ReactNode
}) {
  const secondary = columns.twoLine
    ? (row.description.detail ?? metaLine(row, categoryName))
    : row.description.detail

  return (
    <DataCell className="whitespace-normal">
      <span className="flex items-center gap-[7px]">
        <Truncate
          text={row.description.primary}
          className={cn(
            "min-w-0 text-[13px] leading-[1.3]",
            emphasis ? "font-semibold" : "font-medium",
            row.isUnreviewed && "text-ghost"
          )}
        />
        {trailing}
        {row.isUnreviewed ? (
          <StatusChip status="unreviewed" size="row" className="flex-none" />
        ) : null}
      </span>
      {secondary === null || secondary === undefined ? null : (
        <Truncate
          text={secondary}
          className="mt-[2px] block font-mono text-[11px] leading-[1.4] text-ink-3"
        />
      )}
    </DataCell>
  )
}

function CategoryCell({
  row,
  categoryName,
  onMarkReviewed,
}: {
  row: LedgerRow
  categoryName: CategoryNameResolver
  onMarkReviewed: (() => void) | null
}) {
  if (onMarkReviewed !== null) {
    return (
      <DataCell>
        <InlineRowAction onClick={onMarkReviewed}>
          Mark reviewed
        </InlineRowAction>
      </DataCell>
    )
  }

  if (row.category !== null) {
    return (
      <DataCell className="text-[12px] leading-none text-ink-3">
        {categoryName(row.category)}
      </DataCell>
    )
  }

  return (
    <DataCell
      title={row.categorySupported ? undefined : NO_CATEGORY_TITLE}
      className="text-[12px] leading-none text-ink-3"
    >
      {row.categorySupported ? "Uncategorised" : EM_DASH}
    </DataCell>
  )
}

function accountMarks(accounts: readonly AccountRef[]) {
  return accounts.map((account) => ({
    seed: account.accountId,
    label: accountLabel(account),
  }))
}

function AccountCell({
  row,
  className,
}: {
  row: LedgerRow
  className: string
}) {
  const accounts = row.accounts
  const first = accounts[0]
  if (first === undefined)
    return <DataCell className={className}>{EM_DASH}</DataCell>

  const label =
    accounts.length > 1
      ? `${accountLabel(first)} +${String(accounts.length - 1)}`
      : accountLabel(first)

  return (
    <DataCell className={className}>
      <span className="flex min-w-0 items-center gap-[7px]">
        <EntityMarkGroup entities={accountMarks(accounts)} />
        <Truncate className="min-w-0 flex-1">{label}</Truncate>
      </span>
    </DataCell>
  )
}

function LedgerTransactionRowView({
  row,
  columns,
  selection,
  categoryName,
  onMarkReviewed,
  onOpen,
}: {
  row: LedgerTransactionRow
  columns: LedgerColumns
  selection: LedgerSelection
  categoryName: CategoryNameResolver
  onMarkReviewed: (transactionIds: readonly string[]) => void
  onOpen: (transactionId: TransactionId) => void
}) {
  const amounts = row.primaryAmount === null ? [] : [row.primaryAmount]

  return (
    <DataRow
      data-slot="ledger-row"
      data-row-id={row.rowId}
      size={ledgerRowSize(columns)}
      variant={row.isUnreviewed ? "ghost" : "default"}
      className={columns.twoLine ? "h-[58px]" : undefined}
      aria-label={`Open ${row.description.primary}`}
      {...activationProps(() => {
        onOpen(row.transactionId)
      })}
    >
      {columns.select ? (
        <DataCell>
          <RowCheckbox
            label={`Select ${row.description.primary}`}
            checked={selection.isSelected(row.rowId)}
            onToggle={() => {
              selection.toggle(row.rowId)
            }}
          />
        </DataCell>
      ) : null}
      {columns.glyph ? (
        <GlyphCell>
          <TypeGlyph row={row} categoryName={categoryName} />
        </GlyphCell>
      ) : null}

      <Description row={row} columns={columns} categoryName={categoryName} />

      {columns.date ? (
        <DataCell className="font-mono text-[11px] leading-none font-medium text-ink-3">
          {formatDateStamp(row.date)}
        </DataCell>
      ) : null}
      {columns.type ? (
        <DataCell className="text-[11px] leading-none font-medium text-ink-2">
          {row.typeName}
        </DataCell>
      ) : null}
      {columns.account ? (
        <AccountCell
          row={row}
          className="text-[12px] leading-none text-ink-2"
        />
      ) : null}
      {columns.category ? (
        <CategoryCell
          row={row}
          categoryName={categoryName}
          onMarkReviewed={
            row.isUnreviewed
              ? () => {
                  onMarkReviewed([row.transactionId])
                }
              : null
          }
        />
      ) : null}

      <FigureCell>
        <AmountStack amounts={amounts} intent={row.figureIntent} />
      </FigureCell>
    </DataRow>
  )
}

function LedgerChildRow({
  child,
  columns,
  categoryName,
  onOpen,
}: {
  child: LedgerTransactionRow
  columns: LedgerColumns
  categoryName: CategoryNameResolver
  onOpen: (transactionId: TransactionId) => void
}) {
  const amounts = child.primaryAmount === null ? [] : [child.primaryAmount]

  return (
    <DataRow
      data-slot="ledger-child-row"
      size={ledgerChildSize(columns)}
      variant="child"
      aria-label={`Open ${child.description.primary}`}
      {...activationProps(() => {
        onOpen(child.transactionId)
      })}
    >
      {columns.select ? <DataCell /> : null}
      {columns.glyph ? (
        <DataCell className="h-full self-stretch">
          <span className="flex h-full items-center gap-[3px]">
            <ChildSeam className="shrink-0" />
            <TypeGlyph row={child} categoryName={categoryName} />
          </span>
        </DataCell>
      ) : null}
      <DataCell className="text-[12.5px] leading-[1.3] text-ink-2">
        <Truncate text={child.description.primary} />
      </DataCell>
      {columns.date ? <DataCell /> : null}
      {columns.type ? (
        <DataCell className="text-[11px] leading-none font-medium text-ink-3">
          {child.typeName}
        </DataCell>
      ) : null}
      {columns.account ? (
        <AccountCell
          row={child}
          className="text-[12px] leading-none text-ink-3"
        />
      ) : null}
      {columns.category ? (
        <DataCell className="text-[12px] leading-none text-ink-3">
          {child.category === null ? EM_DASH : categoryName(child.category)}
        </DataCell>
      ) : null}
      <FigureCell>
        <AmountStack
          amounts={amounts}
          intent={child.isUnreviewed ? "ghost" : "secondary"}
          size="micro"
        />
      </FigureCell>
    </DataRow>
  )
}

export interface GroupRowOffer {
  readonly label: string
  readonly onAccept: () => void
}

export type GroupRowOfferResolver = (
  row: LedgerGroupRow
) => GroupRowOffer | null

function LedgerGroupRowView({
  row,
  columns,
  selection,
  categoryName,
  expanded,
  onToggleExpanded,
  onOpen,
  onOpenChild,
  offer,
}: {
  row: LedgerGroupRow
  columns: LedgerColumns
  selection: LedgerSelection
  categoryName: CategoryNameResolver
  expanded: boolean
  onToggleExpanded: () => void
  onOpen: (groupId: TransactionGroupId) => void
  onOpenChild: (transactionId: TransactionId) => void
  offer?: GroupRowOffer | null
}) {
  const activation = activationProps(() => {
    onOpen(row.groupId)
  })
  const disclosureLabel = `${expanded ? "Collapse" : "Expand"} ${row.description.primary}`

  return (
    <>
      <DataRow
        data-slot="ledger-row"
        data-row-id={row.rowId}
        data-group="true"
        size={ledgerRowSize(columns)}
        variant={row.isUnreviewed ? "ghost" : "group"}
        className={columns.twoLine ? "h-[58px]" : undefined}
        aria-label={`Open ${row.description.primary}`}
        aria-expanded={expanded}
        {...activation}
        onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => {
          if (event.target === event.currentTarget) {
            if (event.key === "ArrowRight") {
              event.preventDefault()
              if (!expanded) onToggleExpanded()
              return
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault()
              if (expanded) onToggleExpanded()
              return
            }
          }
          activation.onKeyDown(event)
        }}
      >
        {columns.select ? (
          <DataCell>
            <RowCheckbox
              label={`Select ${row.description.primary}`}
              checked={selection.isSelected(row.rowId)}
              onToggle={() => {
                selection.toggle(row.rowId)
              }}
            />
          </DataCell>
        ) : null}
        {columns.glyph ? (
          <DataCell className="h-full self-stretch overflow-visible">
            <button
              type="button"
              data-slot="group-disclosure"
              aria-expanded={expanded}
              aria-label={disclosureLabel}
              onClick={(event) => {
                event.stopPropagation()
                onToggleExpanded()
              }}
              className={cn(
                "flex h-full w-full items-center justify-center outline-none",
                HIT_TARGET,
                focusRing.sm
              )}
            >
              <DisclosureCaret expanded={expanded} />
            </button>
          </DataCell>
        ) : null}

        <Description
          row={row}
          columns={columns}
          categoryName={categoryName}
          emphasis
          trailing={
            <>
              <CountChip className="flex-none">{row.childCount}</CountChip>
              {offer === null || offer === undefined ? null : (
                <InlineRowAction
                  data-slot="group-row-offer"
                  className="flex-none"
                  onClick={(event) => {
                    event.stopPropagation()
                    offer.onAccept()
                  }}
                >
                  {offer.label}
                </InlineRowAction>
              )}
            </>
          }
        />

        {columns.date ? (
          <DataCell className="font-mono text-[11px] leading-none font-medium text-ink-3">
            {formatDateStamp(row.date)}
          </DataCell>
        ) : null}
        {columns.type ? (
          <DataCell className="text-[11px] leading-none font-medium text-ink-2">
            Group
          </DataCell>
        ) : null}
        {columns.account ? (
          <AccountCell
            row={row}
            className="text-[12px] leading-none text-ink-2"
          />
        ) : null}
        {columns.category ? (
          <DataCell className="text-[12px] leading-none text-ink-3">
            {row.category === null ? EM_DASH : categoryName(row.category)}
          </DataCell>
        ) : null}

        <FigureCell>
          <AmountStack amounts={row.amountsByAsset} intent={row.figureIntent} />
        </FigureCell>
      </DataRow>

      {expanded
        ? row.children.map((child) => (
            <LedgerChildRow
              key={child.rowId}
              child={child}
              columns={columns}
              categoryName={categoryName}
              onOpen={onOpenChild}
            />
          ))
        : null}
    </>
  )
}

export type BandScope = "complete" | "partial" | "pending"

function BandTotals({
  group,
  scope,
  loadedCount,
}: {
  group: PivotGroup
  scope: BandScope
  loadedCount: number
}) {
  if (scope === "pending") {
    return (
      <span className="text-[10px] leading-none text-ink-3">
        still loading this day
      </span>
    )
  }

  const shown = group.totals.slice(0, DAY_NET_FIGURE_LIMIT)

  return (
    <span className="flex items-center gap-[10px]">
      {scope === "partial" ? (
        <span
          data-slot="band-scope"
          className="flex items-center gap-[4px] text-[10px] leading-none text-ink-3"
        >
          over the{" "}
          <Figure value={loadedCount} kind="plain" intent="meta" size="micro" />{" "}
          rows loaded
        </span>
      ) : group.share === null ? null : (
        <ShareBar
          value={group.share}
          variant="pivot"
          label={`${group.label} share of the largest group`}
          className="flex-none"
        />
      )}
      {shown.map((amount, index) => (
        <Figure
          key={`${String(amount.asset.assetId)}-${String(index)}`}
          {...nativeFigureProps(amount)}
          intent="meta"
          size="micro"
          className="text-[10.5px]"
        />
      ))}
      {group.totals.length > shown.length ? (
        <span className="text-[10px] leading-none text-ink-3">
          +{group.totals.length - shown.length} more
        </span>
      ) : null}
    </span>
  )
}

export interface LedgerTableProps {
  pivot: PivotResult
  columns: LedgerColumns
  selection: LedgerSelection
  categoryName: CategoryNameResolver
  onMarkReviewed: (transactionIds: readonly string[]) => void
  onOpenTransaction: (transactionId: TransactionId) => void
  onOpenGroup?: (groupId: TransactionGroupId) => void
  expanded: ReadonlySet<string>
  onToggleExpanded: (rowId: string) => void
  loadedCount: number
  totalResults: number | undefined
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  groupRowOffer?: GroupRowOfferResolver
}

function bandScope(
  group: PivotGroup,
  pivot: PivotResult,
  hasNextPage: boolean
): BandScope {
  if (!hasNextPage) return "complete"
  if (pivot.mode !== "day") return "partial"
  return group.key === pivot.groups[pivot.groups.length - 1]?.key
    ? "pending"
    : "complete"
}

export function LedgerTable({
  pivot,
  columns,
  selection,
  categoryName,
  onMarkReviewed,
  onOpenTransaction,
  onOpenGroup,
  expanded,
  onToggleExpanded,
  loadedCount,
  totalResults,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  groupRowOffer,
}: LedgerTableProps) {
  const cells = ledgerCellCount(columns)
  const allRowIds = useMemo(
    () => pivot.groups.flatMap((group) => group.rows.map((row) => row.rowId)),
    [pivot.groups]
  )
  const allSelected = useMemo(
    () =>
      allRowIds.length > 0 &&
      allRowIds.every((rowId) => selection.isSelected(rowId)),
    [allRowIds, selection]
  )

  return (
    <>
      <DataTable
        aria-label="Transactions"
        columns={LEDGER_COLUMNS[columns.banding]}
        gap={LEDGER_GAP[columns.banding]}
        padding={LEDGER_PADDING}
      >
        <DataTableHead>
          <DataTableHeaderRow>
            {columns.select ? (
              <DataTableHeaderCell>
                <Checkbox
                  aria-label="Select every loaded transaction"
                  checked={allSelected}
                  onCheckedChange={() => {
                    selection.setMany(allRowIds, !allSelected)
                  }}
                />
              </DataTableHeaderCell>
            ) : null}
            {columns.glyph ? <DataTableHeaderCell /> : null}
            <DataTableHeaderCell>Description</DataTableHeaderCell>
            {columns.date ? (
              <DataTableHeaderCell>Date</DataTableHeaderCell>
            ) : null}
            {columns.type ? (
              <DataTableHeaderCell>Type</DataTableHeaderCell>
            ) : null}
            {columns.account ? (
              <DataTableHeaderCell>Account</DataTableHeaderCell>
            ) : null}
            {columns.category ? (
              <DataTableHeaderCell>Category</DataTableHeaderCell>
            ) : null}
            <DataTableHeaderCell numeric>Amount</DataTableHeaderCell>
          </DataTableHeaderRow>
        </DataTableHead>

        <DataTableBody>
          {pivot.groups.map((group) => (
            <BandGroup
              key={group.key}
              group={group}
              cells={cells}
              columns={columns}
              selection={selection}
              categoryName={categoryName}
              onMarkReviewed={onMarkReviewed}
              onOpenTransaction={onOpenTransaction}
              onOpenGroup={onOpenGroup ?? onOpenTransaction}
              expanded={expanded}
              onToggleExpanded={onToggleExpanded}
              loadedCount={loadedCount}
              scope={bandScope(group, pivot, hasNextPage)}
              {...(groupRowOffer === undefined ? {} : { groupRowOffer })}
            />
          ))}
        </DataTableBody>
      </DataTable>

      <InfiniteLoadFooter
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
        label="Load more rows"
        note={
          totalResults === undefined ? (
            <>
              <Figure
                value={loadedCount}
                kind="plain"
                intent="meta"
                size="micro"
              />{" "}
              loaded
            </>
          ) : (
            <>
              <Figure
                value={loadedCount}
                kind="plain"
                intent="meta"
                size="micro"
              />{" "}
              of{" "}
              <Figure
                value={totalResults}
                kind="plain"
                intent="meta"
                size="micro"
              />{" "}
              loaded
            </>
          )
        }
      />
    </>
  )
}

function BandGroup({
  group,
  cells,
  columns,
  selection,
  categoryName,
  onMarkReviewed,
  onOpenTransaction,
  onOpenGroup,
  expanded,
  onToggleExpanded,
  loadedCount,
  scope,
  groupRowOffer,
}: {
  group: PivotGroup
  cells: number
  columns: LedgerColumns
  selection: LedgerSelection
  categoryName: CategoryNameResolver
  onMarkReviewed: (transactionIds: readonly string[]) => void
  onOpenTransaction: (transactionId: TransactionId) => void
  onOpenGroup: (groupId: TransactionGroupId) => void
  expanded: ReadonlySet<string>
  onToggleExpanded: (rowId: string) => void
  loadedCount: number
  scope: BandScope
  groupRowOffer?: GroupRowOfferResolver
}) {
  return (
    <>
      <DayBandRow
        span={cells}
        data-band={group.key}
        data-scope={scope}
        label={group.label}
        date={group.meta}
        net={
          <BandTotals group={group} scope={scope} loadedCount={loadedCount} />
        }
      />
      {group.rows.map((row) =>
        isGroupRow(row) ? (
          <LedgerGroupRowView
            key={row.rowId}
            row={row}
            columns={columns}
            selection={selection}
            categoryName={categoryName}
            expanded={expanded.has(row.rowId)}
            onToggleExpanded={() => {
              onToggleExpanded(row.rowId)
            }}
            onOpen={onOpenGroup}
            onOpenChild={onOpenTransaction}
            offer={groupRowOffer?.(row) ?? null}
          />
        ) : (
          <LedgerTransactionRowView
            key={row.rowId}
            row={row}
            columns={columns}
            selection={selection}
            categoryName={categoryName}
            onMarkReviewed={onMarkReviewed}
            onOpen={onOpenTransaction}
          />
        )
      )}
    </>
  )
}
