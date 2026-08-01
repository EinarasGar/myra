import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { useUserId } from "@/auth"
import { useShellWidth } from "@/components/layout/breakpoints"
import { ErrorStateFor } from "@/components/layout/error-states"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import {
  Panel,
  PanelFootnote,
  PanelHeader,
  PanelNote,
  PanelTitle,
} from "@/components/primitives"
import { DegradedState } from "@/components/states/message-state"
import { Figure } from "@/components/figure"
import type { Category } from "@/lib/domain/refs"
import { cn } from "@/lib/utils"

import type { LedgerGroupRow, LedgerResult, VisibilitySubject } from "../api"
import {
  isGroupRow,
  useApplyVisibility,
  useDeleteTransactions,
  useLedger,
} from "../api"

import type { DrawerCursor, DrawerCursorOptions } from "../drawer"
import { TransactionPanel, useDrawerCursor } from "../drawer"
import type { TransactionEditorController } from "../editor"
import type { GroupingSurface } from "../grouping"
import { GroupPickerDialog, groupingActionFor } from "../grouping"

import { useCategoryNames } from "./category-names"
import { ledgerScopeFootnote, STALE_ROWS_STATUS } from "./copy"
import { GroupByBar } from "./group-by-bar"
import { LedgerTable } from "./ledger-table"
import type { PivotResult } from "./pivot"
import { pivotRows, transactionRowIndex, visibleTransactionIds } from "./pivot"
import { ledgerBanding, ledgerColumns, ledgerEmptyState } from "./presentation"
import { QueryBar } from "./query-bar"
import {
  selectionActions,
  selectionTargets,
  useLedgerSelection,
  visibilitySubjects,
} from "./selection"
import { SelectionBar } from "./selection-bar"
import { SlicePanel } from "./slice-panel"
import {
  LedgerEmpty,
  LedgerFilteredEmpty,
  LedgerSkeleton,
  SlicePanelSkeleton,
} from "./states"
import type {
  ExplorePatchSearch,
  ExploreSearch,
  ExploreSearchPatch,
} from "./tokens"
import { CLEARED_SEARCH, readKeys, useLedgerTokens, writeKeys } from "./tokens"

function LedgerPanel({
  ledger,
  pivot,
  grouping,
  onPatch,
  cursor,
  expanded,
  onToggleExpanded,
  onAdd,
  onOpenGroup,
}: {
  ledger: LedgerResult
  pivot: PivotResult
  grouping: GroupingSurface
  onPatch: (patch: ExploreSearchPatch) => void
  cursor: DrawerCursor
  expanded: ReadonlySet<string>
  onToggleExpanded: (rowId: string) => void
  onAdd: () => void
  onOpenGroup: (groupId: string) => void
}) {
  const userId = useUserId()
  const navigate = useNavigate()
  const width = useShellWidth()
  const columns = ledgerColumns(width, ledgerBanding(pivot.mode))
  const selection = useLedgerSelection()
  const categoryNames = useCategoryNames(userId)

  const visibility = useApplyVisibility(userId)
  const removal = useDeleteTransactions(userId)

  const categoryName = useCallback(
    (category: Category) => categoryNames(category.id) ?? category.name,
    [categoryNames]
  )

  const targets = useMemo(
    () => selectionTargets(ledger.rows, selection.ids),
    [ledger.rows, selection.ids]
  )
  const actions = useMemo(() => selectionActions(targets), [targets])
  const groupingAction = useMemo(
    () => groupingActionFor(targets.rows),
    [targets.rows]
  )

  const openGrouping = useCallback(() => {
    if (groupingAction.kind === "create") {
      grouping.composer.openCreate(groupingAction.members)
    }
    if (groupingAction.kind === "add") {
      grouping.composer.openAdd(groupingAction.group, groupingAction.members)
    }
    selection.clear()
  }, [groupingAction, grouping.composer, selection])

  const looseSelection = useMemo(() => {
    if (targets.rows.some((row) => isGroupRow(row))) return []
    return targets.rows.filter((row) => !isGroupRow(row))
  }, [targets.rows])

  const groupRowOffer = useCallback(
    (row: LedgerGroupRow) => {
      if (looseSelection.length === 0) return null
      return {
        label: `Add ${String(looseSelection.length)} here`,
        onAccept: () => {
          grouping.composer.openAdd(row, looseSelection)
          selection.clear()
        },
      }
    },
    [looseSelection, grouping.composer, selection]
  )

  const subjectsById = useMemo(() => {
    const index = new Map<string, VisibilitySubject>()
    for (const subject of visibilitySubjects(ledger.rows)) {
      index.set(subject.transactionId, subject)
    }
    return index
  }, [ledger.rows])

  const markReviewed = useCallback(
    (transactionIds: readonly string[]) => {
      const subjects = transactionIds
        .map((transactionId) => subjectsById.get(transactionId))
        .filter(
          (subject): subject is VisibilitySubject => subject !== undefined
        )
      visibility.applyIntent(subjects, "markReviewed")
    },
    [subjectsById, visibility]
  )

  const emptiness = ledgerEmptyState(ledger.isEmpty, ledger.plan)

  if (ledger.isPending) return <LedgerSkeleton />
  if (ledger.isError) {
    return <ErrorStateFor error={ledger.error} onRetry={ledger.refetch} />
  }
  if (emptiness === "filtered") {
    return (
      <LedgerFilteredEmpty
        footnote={ledgerScopeFootnote(ledger, pivot)}
        onClear={() => {
          onPatch(CLEARED_SEARCH)
        }}
      />
    )
  }
  if (emptiness !== "rows") {
    return (
      <LedgerEmpty
        hasUnappliedTokens={emptiness === "unapplied-only"}
        onAdd={onAdd}
        onConnect={() => {
          void navigate({ to: "/settings", search: { section: "connections" } })
        }}
      />
    )
  }

  return (
    <>
      <Panel data-slot="ledger-panel">
        <PanelHeader>
          <PanelTitle>Transactions</PanelTitle>
          <PanelNote className="flex items-baseline gap-[5px]">
            <Figure
              value={ledger.loadedCount}
              kind="plain"
              intent="meta"
              size="micro"
            />
            {ledger.loadedCount === 1 ? "row loaded" : "rows loaded"}
          </PanelNote>
        </PanelHeader>

        <LedgerTable
          pivot={pivot}
          columns={columns}
          selection={selection}
          categoryName={categoryName}
          onMarkReviewed={markReviewed}
          onOpenTransaction={cursor.open}
          onOpenGroup={onOpenGroup}
          expanded={expanded}
          onToggleExpanded={onToggleExpanded}
          loadedCount={ledger.loadedCount}
          totalResults={ledger.totalResults}
          hasNextPage={ledger.hasNextPage}
          isFetchingNextPage={ledger.isFetchingNextPage}
          onLoadMore={ledger.fetchNextPage}
          groupRowOffer={groupRowOffer}
        />

        <PanelFootnote>{ledgerScopeFootnote(ledger, pivot)}</PanelFootnote>
      </Panel>

      <SelectionBar
        targets={targets}
        actions={actions}
        grouping={groupingAction}
        onGroup={openGrouping}
        isPending={visibility.isPending || removal.isPending}
        onMarkReviewed={() => {
          visibility.applyIntent(targets.subjects, actions.review.intent)
          selection.clear()
        }}
        onHide={() => {
          visibility.applyIntent(targets.subjects, actions.hide.intent)
          selection.clear()
        }}
        onDelete={() => {
          removal.mutate({
            transactionIds: targets.transactionIds,
            groupIds: targets.groupIds,
          })
          selection.clear()
        }}
        onClear={selection.clear}
      />
    </>
  )
}

export function ExploreScreen({
  search,
  onPatch,
  editor,
  grouping,
}: {
  search: ExploreSearch
  onPatch: ExplorePatchSearch
  editor: TransactionEditorController
  grouping: GroupingSurface
}) {
  const userId = useUserId()
  const tokens = useLedgerTokens(search)
  const ledger = useLedger({ userId, tokens, keepPreviousPage: true })
  const mode = search.group ?? "day"
  const expanded = useMemo(() => readKeys(search.expand), [search.expand])
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null)

  const requested = useMemo(
    () => pivotRows(ledger.rows, mode),
    [ledger.rows, mode]
  )
  const fallback = useMemo(
    () =>
      requested.unsupported === null ? null : pivotRows(ledger.rows, "day"),
    [requested, ledger.rows]
  )
  const pivot = fallback ?? requested

  const visibleIds = useMemo(
    () => visibleTransactionIds(pivot.groups, expanded),
    [pivot.groups, expanded]
  )
  const rowsById = useMemo(
    () => transactionRowIndex(pivot.groups),
    [pivot.groups]
  )
  const changeOpenTransaction = useCallback<DrawerCursorOptions["onChange"]>(
    (transactionId, history) => {
      onPatch({ tx: transactionId ?? undefined }, history)
    },
    [onPatch]
  )

  const paging = useMemo(
    () => ({ hasMore: ledger.hasNextPage, loadMore: ledger.fetchNextPage }),
    [ledger.hasNextPage, ledger.fetchNextPage]
  )

  const cursor = useDrawerCursor(visibleIds, {
    transactionId: search.tx ?? null,
    onChange: changeOpenTransaction,
    paging,
  })

  const groupsById = useMemo(() => {
    const index = new Map<string, LedgerGroupRow>()
    for (const row of ledger.rows) {
      if (isGroupRow(row)) index.set(row.groupId, row)
    }
    return index
  }, [ledger.rows])

  const openGroup =
    cursor.transactionId === null
      ? null
      : (groupsById.get(cursor.transactionId) ?? null)

  const openRow =
    cursor.transactionId === null
      ? null
      : (rowsById[cursor.transactionId] ?? null)
  const openRowGroup =
    openRow?.groupId === null || openRow?.groupId === undefined
      ? null
      : (groupsById.get(openRow.groupId) ?? null)

  const toggleExpanded = useCallback(
    (rowId: string) => {
      const next = new Set(expanded)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      onPatch({ expand: writeKeys(next) })
    },
    [expanded, onPatch]
  )

  return (
    <div data-slot="explore" className="flex flex-col">
      <QueryBar
        tokens={tokens}
        plan={ledger.plan}
        onPatch={onPatch}
        onClearAll={() => {
          onPatch(CLEARED_SEARCH)
        }}
      />

      <PanelBoundary pending={<SlicePanelSkeleton />}>
        {ledger.isPending ? (
          <SlicePanelSkeleton />
        ) : (
          <SlicePanel ledger={ledger} />
        )}
      </PanelBoundary>

      <GroupByBar
        mode={mode}
        onModeChange={(next) => {
          onPatch({ group: next })
        }}
        loadedCount={ledger.loadedCount}
        totalResults={ledger.totalResults}
      />

      {requested.unsupported === null ? null : (
        <DegradedState
          className="mb-3"
          headline={`Sverto cannot group by ${mode}`}
          body={requested.unsupported}
          actions={[
            {
              label: "Group by day",
              kind: "primary",
              onClick: () => {
                onPatch({ group: "day" })
              },
            },
          ]}
        />
      )}

      <div
        aria-busy={ledger.isPlaceholder}
        className={cn(
          "flex min-w-0 flex-col transition-opacity duration-quick ease-out-quick",
          ledger.isPlaceholder && "opacity-55"
        )}
      >
        {ledger.isPlaceholder ? (
          <span role="status" className="sr-only">
            {STALE_ROWS_STATUS}
          </span>
        ) : null}
        <PanelBoundary pending={<LedgerSkeleton />}>
          <LedgerPanel
            ledger={ledger}
            pivot={pivot}
            grouping={grouping}
            onPatch={onPatch}
            cursor={cursor}
            expanded={expanded}
            onToggleExpanded={toggleExpanded}
            onAdd={() => {
              editor.openCreate()
            }}
            onOpenGroup={cursor.open}
          />
        </PanelBoundary>
      </div>

      <TransactionPanel
        userId={userId}
        editor={editor}
        view={{
          transactionId: cursor.transactionId,
          groupRow: openGroup,
          open: cursor.isOpen,
          row: openRow,
          onOpenTransaction: (transactionId) => {
            cursor.open(transactionId)
          },
          group: {
            label: openRowGroup?.description.primary ?? null,
            isWriting: grouping.actions.isRemoving || grouping.actions.isAdding,
            onAddToGroup: (row) => {
              setAddingToGroup(row.transactionId)
            },
            onAddChild: (subject) => {
              grouping.composer.openAdd(subject)
            },
            onRemoveChild: (child, subject) => {
              grouping.actions.removeFromGroup(child, subject)
            },
            ...(openRowGroup === null
              ? {}
              : {
                  onRemoveFromGroup: (row) => {
                    grouping.actions.removeFromGroup(row, openRowGroup)
                    cursor.close()
                  },
                }),
          },
          onOpenChange: (open) => {
            if (open) return
            cursor.close()
          },
          ...(cursor.hasPlace
            ? {
                cursor: {
                  position: cursor.position,
                  total: cursor.total,
                  totalIsLowerBound: cursor.totalIsLowerBound,
                  canStepBack: cursor.canStepBack,
                  canStepForward: cursor.canStepForward,
                  isLoadingMore: cursor.isLoadingMore,
                  onStep: cursor.step,
                },
              }
            : {}),
        }}
      />

      <GroupPickerDialog
        userId={userId}
        row={addingToGroup === null ? null : (rowsById[addingToGroup] ?? null)}
        open={addingToGroup !== null}
        actions={grouping.actions}
        onOpenChange={(open) => {
          if (!open) setAddingToGroup(null)
        }}
      />
    </div>
  )
}
