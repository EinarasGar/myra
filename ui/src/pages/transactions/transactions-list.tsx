import React, { useState, useRef, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
  CombinedTransactionItem,
  RequiredIdentifiableTransaction,
  GroupTransactionItem,
  TransactionWithEntryIds,
  IdentifiableTransaction,
} from "@/api/api";
import { useUserId } from "@/hooks/use-auth";
import useGetCombinedTransactions from "@/hooks/api/use-get-combined-transactions";
import useDeleteTransaction from "@/hooks/api/use-delete-transaction";
import useDeleteTransactionGroup from "@/hooks/api/use-delete-transaction-group";
import useMoveTransactionToIndividual from "@/hooks/api/use-move-transaction-to-individual";
import useUpdateTransactionGroup from "@/hooks/api/use-update-transaction-group";
import { useTransactionSelectionStore } from "@/hooks/store/use-transaction-selection-store";
import {
  TableHeader,
  TableBody,
  TableRow as ShadTableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import TransactionRow from "./transaction-row";
import TransactionGroupRow from "./transaction-group-row";
import TransactionDetailModal from "./transaction-detail-modal";
import TransactionGroupDetailModal from "./transaction-group-detail-modal";
import TransactionsEmptyState from "./transactions-empty-state";
import {
  TransactionContextMenu,
  TransactionAvatar,
} from "./transaction-context-menu";
import { findTransactionsByIds } from "./transaction-display-utils";

type DisplayRow =
  | { type: "item"; data: CombinedTransactionItem }
  | {
      type: "child";
      data: RequiredIdentifiableTransaction;
      parentGroupId: string;
    };

interface TransactionsListProps {
  query?: string;
  onAddTransaction: () => void;
}

const COL_COUNT = 9; // avatar + 7 data columns + actions

const colgroup = (
  <colgroup>
    <col style={{ width: "40px" }} />
    <col style={{ width: "8%" }} />
    <col style={{ width: "18%" }} />
    <col style={{ width: "10%" }} />
    <col style={{ width: "14%" }} />
    <col style={{ width: "8%" }} />
    <col style={{ width: "12%" }} />
    <col style={{ width: "22%" }} />
    <col style={{ width: "48px" }} />
  </colgroup>
);

export default function TransactionsList({
  query,
  onAddTransaction,
}: TransactionsListProps) {
  const userId = useUserId();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetCombinedTransactions(userId, query);
  const deleteTransaction = useDeleteTransaction(userId);
  const deleteTransactionGroup = useDeleteTransactionGroup(userId);
  const moveToIndividual = useMoveTransactionToIndividual(userId);

  const allItems = useMemo(
    () => data?.pages.flatMap((p) => p.results) ?? [],
    [data],
  );
  const totalResults = data?.pages[data.pages.length - 1]?.total_results;

  const updateTransactionGroup = useUpdateTransactionGroup(userId);

  const { selectedItems, enterSelectionMode, exitSelectionMode, toggleItem } =
    useTransactionSelectionStore();

  const hasIndividualSelection = useMemo(() => {
    if (selectedItems.size === 0) return false;
    return Array.from(selectedItems.values()).every((t) => t === "individual");
  }, [selectedItems]);

  // Expanded groups state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Build display rows
  const displayRows = useMemo<DisplayRow[]>(() => {
    const rows: DisplayRow[] = [];
    for (const item of allItems) {
      rows.push({ type: "item", data: item });
      if (item.item_type === "group" && expandedGroups.has(item.group_id)) {
        for (const child of item.transactions) {
          rows.push({
            type: "child",
            data: child,
            parentGroupId: item.group_id,
          });
        }
      }
    }
    return rows;
  }, [allItems, expandedGroups]);

  // Detail modals state
  const [selectedTransaction, setSelectedTransaction] =
    useState<RequiredIdentifiableTransaction | null>(null);
  const [selectedGroup, setSelectedGroup] =
    useState<GroupTransactionItem | null>(null);

  // Scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling - only when many rows
  const useVirtual = displayRows.length > 100;
  const virtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 41,
    overscan: 20,
    enabled: useVirtual,
  });

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getRowId = (row: DisplayRow): string => {
    if (row.type === "child") return row.data.transaction_id;
    const item = row.data;
    if (item.item_type === "group") return item.group_id;
    return (item as unknown as RequiredIdentifiableTransaction).transaction_id;
  };

  const getRowItemType = (row: DisplayRow): "individual" | "group" => {
    if (row.type === "child") return "individual";
    return row.data.item_type === "group" ? "group" : "individual";
  };

  const getRowTransactionType = (row: DisplayRow): string => {
    if (row.type === "child") return row.data.type;
    if (row.data.item_type === "group") return "group";
    return (row.data as unknown as RequiredIdentifiableTransaction).type;
  };

  // Build avatar cell for a row
  const buildAvatarCell = (
    row: DisplayRow,
    rowId: string,
    rowItemType: "individual" | "group",
  ) => {
    const txType = getRowTransactionType(row);
    const isGroup = row.type === "item" && row.data.item_type === "group";
    return (
      <TableCell className="w-[40px] px-1">
        <TransactionAvatar
          type={txType}
          isGroup={isGroup}
          isSelected={selectedItems.has(rowId)}
          onToggleSelect={() => {
            if (selectedItems.size === 0) {
              enterSelectionMode(rowId, rowItemType);
            } else {
              toggleItem(rowId, rowItemType);
            }
          }}
        />
      </TableCell>
    );
  };

  const buildActionsCell = (
    row: DisplayRow,
    rowId: string,
    rowItemType: "individual" | "group",
  ) => {
    // For child rows (expanded group children), add move-out-of-group option
    if (row.type === "child") {
      const childTx = row.data;
      return (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <TransactionContextMenu
            onDelete={() => deleteTransaction.mutate(childTx.transaction_id)}
            onSelect={() =>
              enterSelectionMode(childTx.transaction_id, "individual")
            }
            onMoveOutOfGroup={() => {
              const { transaction_id: _, ...transaction } = childTx;
              moveToIndividual.mutate({
                transactionId: childTx.transaction_id,
                data: {
                  transaction: transaction as TransactionWithEntryIds,
                },
              });
            }}
          />
        </TableCell>
      );
    }

    // For group rows, show context menu with optional move-to-group
    if (row.type === "item" && row.data.item_type === "group") {
      const group = row.data as GroupTransactionItem;
      return (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <TransactionContextMenu
            onDelete={() => deleteTransactionGroup.mutate(rowId)}
            onSelect={() => enterSelectionMode(rowId, rowItemType)}
            onMoveToGroup={
              hasIndividualSelection
                ? () => {
                    const selectedIds = new Set(
                      Array.from(selectedItems.entries())
                        .filter(([, t]) => t === "individual")
                        .map(([id]) => id),
                    );
                    const selectedTxs = findTransactionsByIds(
                      allItems,
                      selectedIds,
                    );
                    if (selectedTxs.length === 0) return;
                    const allTxs: IdentifiableTransaction[] = [
                      ...(group.transactions as IdentifiableTransaction[]),
                      ...(selectedTxs as IdentifiableTransaction[]),
                    ];
                    updateTransactionGroup.mutate(
                      {
                        groupId: group.group_id,
                        data: {
                          description: group.description,
                          category_id: group.category_id,
                          date: group.date,
                          transactions: allTxs,
                        },
                      },
                      {
                        onSuccess: () => exitSelectionMode(),
                      },
                    );
                  }
                : undefined
            }
          />
        </TableCell>
      );
    }
    return (
      <TableCell onClick={(e) => e.stopPropagation()}>
        <TransactionContextMenu
          onDelete={() => {
            if (rowItemType === "group") {
              deleteTransactionGroup.mutate(rowId);
            } else {
              deleteTransaction.mutate(rowId);
            }
          }}
          onSelect={() => enterSelectionMode(rowId, rowItemType)}
        />
      </TableCell>
    );
  };

  // Render a single row
  const renderRow = (row: DisplayRow) => {
    const rowId = getRowId(row);
    const rowItemType = getRowItemType(row);
    const avatarCell = buildAvatarCell(row, rowId, rowItemType);
    const actionsCell = buildActionsCell(row, rowId, rowItemType);

    if (row.type === "child") {
      return (
        <TransactionRow
          key={`child-${row.data.transaction_id}`}
          transaction={row.data}
          onClick={() => setSelectedTransaction(row.data)}
          isChild
          avatarCell={avatarCell}
          actionsCell={actionsCell}
        />
      );
    }

    const item = row.data;
    if (item.item_type === "group") {
      return (
        <TransactionGroupRow
          key={`group-${item.group_id}`}
          group={item}
          isExpanded={expandedGroups.has(item.group_id)}
          onToggleExpand={() => toggleGroup(item.group_id)}
          onDetailClick={() => setSelectedGroup(item)}
          avatarCell={avatarCell}
          actionsCell={actionsCell}
        />
      );
    }

    // individual
    const tx = item as unknown as RequiredIdentifiableTransaction;
    return (
      <TransactionRow
        key={`individual-${tx.transaction_id}`}
        transaction={tx}
        onClick={() => setSelectedTransaction(tx)}
        avatarCell={avatarCell}
        actionsCell={actionsCell}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (allItems.length === 0) {
    return <TransactionsEmptyState onAddTransaction={onAddTransaction} />;
  }

  return (
    <div className="flex flex-col">
      {/* Summary */}
      <div className="px-4 py-2 text-sm text-muted-foreground">
        {totalResults != null
          ? `${totalResults} results`
          : `${allItems.length} items`}
      </div>

      {/* Table with fixed header */}
      <div className="border rounded-md">
        <table className="w-full table-fixed text-sm">
          {colgroup}
          <TableHeader>
            <ShadTableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead />
            </ShadTableRow>
          </TableHeader>
        </table>

        {/* Scrollable body */}
        <div
          ref={scrollContainerRef}
          className="overflow-auto"
          style={{ maxHeight: "calc(100vh - 300px)" }}
          onScroll={handleScroll}
        >
          <table className="w-full table-fixed text-sm">
            {colgroup}
            <TableBody>
              {useVirtual ? (
                <>
                  {(virtualizer.getVirtualItems()[0]?.start ?? 0) > 0 && (
                    <tr>
                      <td
                        colSpan={COL_COUNT}
                        style={{
                          height: virtualizer.getVirtualItems()[0].start,
                        }}
                      />
                    </tr>
                  )}
                  {virtualizer.getVirtualItems().map((vr) => (
                    <React.Fragment key={vr.key}>
                      {renderRow(displayRows[vr.index])}
                    </React.Fragment>
                  ))}
                  {(() => {
                    const items = virtualizer.getVirtualItems();
                    const lastItem = items[items.length - 1];
                    const remaining = lastItem
                      ? virtualizer.getTotalSize() - lastItem.end
                      : 0;
                    return remaining > 0 ? (
                      <tr>
                        <td colSpan={COL_COUNT} style={{ height: remaining }} />
                      </tr>
                    ) : null;
                  })()}
                </>
              ) : (
                displayRows.map((row) => renderRow(row))
              )}
            </TableBody>
          </table>

          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Detail modals */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        open={selectedTransaction !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTransaction(null);
        }}
      />
      <TransactionGroupDetailModal
        group={selectedGroup}
        open={selectedGroup !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedGroup(null);
        }}
      />
    </div>
  );
}
