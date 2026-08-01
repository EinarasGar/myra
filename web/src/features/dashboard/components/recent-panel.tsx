import { useCallback, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { AlignLeft, Camera } from "lucide-react"

import { useUserId } from "@/auth"
import { Figure } from "@/components/figure"
import { useShellWidth, type ShellWidth } from "@/components/layout/breakpoints"
import { ErrorStateFor } from "@/components/layout/error-states"
import {
  CountChip,
  DataCell,
  DataRow,
  DataTable,
  DataTableBody,
  DayBandRow,
  FigureCell,
  focusRing,
  GhostRowMarker,
  GlyphCell,
  Panel,
  PanelFooter,
  PanelHeader,
  PanelNote,
  PanelTitle,
  rowActivation,
  RowGlyph,
  StatusChip,
  TableFoldRow,
  HIT_TARGET_ROW,
  Truncate,
} from "@/components/primitives"
import { EmptyState } from "@/components/states/empty-state"
import { LoadingState, SkeletonRows } from "@/components/states/loading-state"
import type {
  LedgerGroupRow,
  LedgerResult,
  LedgerRow,
  LedgerTransactionRow,
  NativeAmount,
} from "@/features/transactions/api"
import {
  assetUnitsOf,
  isGroupRow,
  nativeFigureProps,
} from "@/features/transactions/api"
import { TransactionPanel } from "@/features/transactions/drawer"
import { DAY_NET_FIGURE_LIMIT } from "@/features/transactions/explore/presentation"
import { ReceiptUploadDialog, SNAP_A_RECEIPT } from "@/features/uploads"
import { useTransactionEditor } from "@/features/transactions/editor"
import { accountLabel } from "@/lib/domain/refs"
import {
  getTransactionTypeConfig,
  transactionFlowTone,
} from "@/lib/domain/transaction-types"
import { formatDateStamp, formatDayLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

import { takeRecentDays, type RecentDay } from "../api"

/**
 * The panel reads the review queue's ledger page, which is deeper than "recent" means,
 * so it windows the rows itself rather than showing everything that happens to be cached.
 */
export const RECENT_WINDOW = 20

export const RECENT_EMPTY_BODY =
  "Add one by hand, connect a bank so imports arrive on their own, or snap a receipt and Myra will read it."

const COLUMNS = {
  full: "20px minmax(0,1fr) 132px 116px",
  tight: "20px minmax(0,1fr) 116px",
  stacked: "16px minmax(0,1fr) 116px",
  phone: "16px minmax(0,1fr) 116px",
}

const ROW_LIMIT: Record<ShellWidth, number> = {
  full: 8,
  tight: 8,
  stacked: 5,
  phone: 3,
}

function isTwoLine(width: ShellWidth): boolean {
  return width === "stacked" || width === "phone"
}

function metaOf(row: LedgerRow): string {
  const account = isGroupRow(row)
    ? (row.accounts[0] ?? null)
    : (row.account ?? null)
  return [account === null ? "" : accountLabel(account), row.category?.name]
    .filter(Boolean)
    .join(" · ")
}

function AmountStack({
  amounts,
  intent,
}: {
  amounts: readonly NativeAmount[]
  intent: LedgerRow["figureIntent"]
}) {
  if (amounts.length === 0) return <Figure value={null} size="base" />

  const shown = amounts.slice(0, DAY_NET_FIGURE_LIMIT)
  return (
    <span className="flex flex-col items-end gap-[2px]">
      {shown.map((amount, index) => (
        <Figure
          key={`${amount.asset.assetId}-${index}`}
          {...nativeFigureProps(amount)}
          intent={intent}
          size={index === 0 ? "base" : "micro"}
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

function GroupGlyph({ row }: { row: LedgerGroupRow }) {
  return row.isUnreviewed ? (
    <GhostRowMarker />
  ) : (
    <span
      aria-hidden
      className="block text-center font-mono text-[12px] leading-none font-medium text-ink-3"
    >
      ▾
    </span>
  )
}

function TransactionGlyph({ row }: { row: LedgerTransactionRow }) {
  const config = getTransactionTypeConfig(row.type)
  const units =
    row.primaryAmount === null ? null : assetUnitsOf(row.primaryAmount)
  const category = row.category
  return (
    <RowGlyph
      icon={category === null ? config.icon : category.icon}
      label={
        category === null ? config.name : `${category.name} · ${config.name}`
      }
      tone={transactionFlowTone(row.type, units)}
      muted={row.isUnreviewed}
    />
  )
}

function RecentRow({
  row,
  width,
  onOpen,
}: {
  row: LedgerRow
  width: ShellWidth
  onOpen: (row: LedgerRow) => void
}) {
  const twoLine = isTwoLine(width)
  const meta = metaOf(row)
  const secondary = twoLine
    ? (row.description.detail ?? meta)
    : row.description.detail
  const amounts: readonly NativeAmount[] = isGroupRow(row)
    ? row.amountsByAsset
    : row.primaryAmount === null
      ? []
      : [row.primaryAmount]

  return (
    <DataRow
      data-slot="recent-row"
      size={twoLine ? "two-line" : "table"}
      variant={row.isUnreviewed ? "ghost" : "default"}
      interactive
      aria-label={`Open ${row.description.primary}`}
      {...rowActivation<HTMLTableRowElement>(() => {
        onOpen(row)
      })}
    >
      <GlyphCell>
        {isGroupRow(row) ? (
          <GroupGlyph row={row} />
        ) : (
          <TransactionGlyph row={row} />
        )}
      </GlyphCell>

      <DataCell className="whitespace-normal">
        <span className="flex items-center gap-[7px]">
          <Truncate
            text={row.description.primary}
            className={cn(
              "min-w-0 text-[13px] leading-[1.3] font-medium",
              row.isUnreviewed && "text-ghost"
            )}
          />
          {isGroupRow(row) ? (
            <CountChip className="flex-none">{row.childCount}</CountChip>
          ) : null}
          {row.isUnreviewed && !twoLine ? (
            <StatusChip status="unreviewed" size="row" className="flex-none" />
          ) : null}
        </span>
        {secondary ? (
          <Truncate
            text={secondary}
            className="mt-[2px] block font-mono text-[11px] leading-[1.4] text-ink-3"
          />
        ) : null}
      </DataCell>

      {width === "full" ? (
        <DataCell className="text-[12px] leading-none text-ink-3">
          {meta}
        </DataCell>
      ) : null}

      <FigureCell>
        <AmountStack amounts={amounts} intent={row.figureIntent} />
      </FigureCell>
    </DataRow>
  )
}

function DayNet({ day }: { day: RecentDay }) {
  const shown = day.netByCurrency.slice(0, DAY_NET_FIGURE_LIMIT)
  if (shown.length === 0) return null

  return (
    <span className="flex items-baseline gap-[10px]">
      {shown.map((amount, index) => (
        <Figure
          key={`${amount.asset.assetId}-${index}`}
          {...nativeFigureProps(amount)}
          intent="meta"
          size="micro"
          className="text-[10.5px]"
        />
      ))}
      {day.netByCurrency.length > shown.length ? (
        <span className="text-[10px] leading-none text-ink-3">
          +{day.netByCurrency.length - shown.length} more
        </span>
      ) : null}
    </span>
  )
}

export function RecentPanelView({
  days,
  totalResults,
  shownCount,
  hiddenCount,
  width,
  onShowMore,
  onOpen,
  onSnapReceipt,
}: {
  days: readonly RecentDay[]
  totalResults: number | undefined
  shownCount: number
  hiddenCount: number
  width: ShellWidth
  onShowMore?: () => void
  onOpen: (row: LedgerRow) => void
  onSnapReceipt?: () => void
}) {
  const columnCount = width === "full" ? 4 : 3
  const showDayNet = width === "full" || width === "tight"

  return (
    <Panel data-slot="recent-panel">
      <PanelHeader>
        <PanelTitle>Recent</PanelTitle>
        <PanelNote className="flex items-baseline gap-[5px]">
          Newest
          <Figure value={shownCount} kind="plain" intent="meta" size="micro" />
          {totalResults === undefined ? null : (
            <>
              of
              <Figure
                value={totalResults}
                kind="plain"
                intent="meta"
                size="micro"
              />
            </>
          )}
          {totalResults === 1 ? "row" : "rows"}
        </PanelNote>
      </PanelHeader>

      <DataTable columns={COLUMNS} headerHeight={0}>
        <DataTableBody>
          {days.map((day) => (
            <RecentDayRows
              key={day.key}
              day={day}
              width={width}
              columnCount={columnCount}
              showNet={showDayNet}
              onOpen={onOpen}
            />
          ))}
          <TableFoldRow
            total={shownCount + hiddenCount}
            shown={shownCount}
            mode="remainder"
            span={columnCount}
            {...(onShowMore === undefined ? {} : { onShowAll: onShowMore })}
          />
        </DataTableBody>
      </DataTable>

      <PanelFooter>
        <Link
          to="/transactions"
          className={cn("outline-none", HIT_TARGET_ROW, focusRing.chip)}
        >
          All transactions →
        </Link>
        {onSnapReceipt === undefined ? null : (
          <button
            type="button"
            onClick={onSnapReceipt}
            className={cn(
              "relative ms-auto flex items-center gap-[6px] text-brand outline-none",
              "after:absolute after:-inset-x-3 after:-inset-y-4 after:content-['']",
              focusRing.chip
            )}
          >
            <Camera aria-hidden className="size-[13px] stroke-[1.8]" />
            {SNAP_A_RECEIPT}
          </button>
        )}
      </PanelFooter>
    </Panel>
  )
}

function RecentDayRows({
  day,
  width,
  columnCount,
  showNet,
  onOpen,
}: {
  day: RecentDay
  width: ShellWidth
  columnCount: number
  showNet: boolean
  onOpen: (row: LedgerRow) => void
}) {
  return (
    <>
      <DayBandRow
        span={columnCount}
        label={formatDayLabel(day.date)}
        date={formatDateStamp(day.date)}
        net={
          showNet && day.hiddenCount === 0 ? <DayNet day={day} /> : undefined
        }
      />
      {day.rows.map((row) => (
        <RecentRow key={row.rowId} row={row} width={width} onOpen={onOpen} />
      ))}
    </>
  )
}

export function RecentPanelSkeleton() {
  return (
    <LoadingState label="Loading recent transactions">
      <SkeletonRows count={7} height={34} />
    </LoadingState>
  )
}

export function RecentPanelEmpty({
  onSnapReceipt,
}: {
  onSnapReceipt: () => void
}) {
  const navigate = useNavigate()
  return (
    <EmptyState
      data-slot="recent-panel"
      icon={<AlignLeft />}
      headline="Nothing here yet"
      body={RECENT_EMPTY_BODY}
      actions={[
        {
          label: "Add a transaction",
          kind: "primary",
          onClick: () => {
            void navigate({ to: "/transactions" })
          },
        },
        {
          label: "Connect a bank",
          onClick: () => {
            void navigate({
              to: "/settings",
              search: { section: "connections" },
            })
          },
        },
        { label: SNAP_A_RECEIPT, onClick: onSnapReceipt },
      ]}
    />
  )
}

export function RecentPanel({ ledger }: { ledger: LedgerResult }) {
  const width = useShellWidth()
  const userId = useUserId()
  const navigate = useNavigate()
  const editor = useTransactionEditor()
  const [showAllLoaded, setShowAllLoaded] = useState(false)
  const [openRow, setOpenRow] = useState<LedgerTransactionRow | null>(null)
  const [isSnapping, setIsSnapping] = useState(false)

  const snapReceipt = useCallback(() => {
    setIsSnapping(true)
  }, [])

  const receiptDialog = (
    <ReceiptUploadDialog
      userId={userId}
      open={isSnapping}
      onOpenChange={setIsSnapping}
      onReviewDrafts={() => {
        setIsSnapping(false)
        void navigate({ to: "/transactions", search: { mode: "review" } })
      }}
    />
  )

  const open = useCallback(
    (row: LedgerRow) => {
      if (isGroupRow(row)) {
        void navigate({ to: "/transactions" })
        return
      }
      setOpenRow(row)
    },
    [navigate]
  )

  if (ledger.isPending) return <RecentPanelSkeleton />
  if (ledger.isError) {
    return <ErrorStateFor error={ledger.error} onRetry={ledger.refetch} />
  }
  if (ledger.isEmpty) {
    return (
      <>
        <RecentPanelEmpty onSnapReceipt={snapReceipt} />
        {receiptDialog}
      </>
    )
  }

  const recent = takeRecentDays(ledger.days, RECENT_WINDOW)
  const { days, shownCount, hiddenCount } = takeRecentDays(
    recent.days,
    showAllLoaded ? RECENT_WINDOW : ROW_LIMIT[width]
  )

  return (
    <>
      <RecentPanelView
        days={days}
        totalResults={ledger.totalResults}
        shownCount={shownCount}
        hiddenCount={hiddenCount}
        width={width}
        onShowMore={() => {
          setShowAllLoaded(true)
        }}
        onOpen={open}
        onSnapReceipt={snapReceipt}
      />

      {receiptDialog}

      <TransactionPanel
        userId={userId}
        editor={editor}
        view={{
          transactionId: openRow?.transactionId ?? null,
          open: openRow !== null,
          row: openRow,
          onOpenChange: (next) => {
            if (!next) setOpenRow(null)
          },
          onDeleted: () => {
            setOpenRow(null)
          },
        }}
      />
    </>
  )
}
