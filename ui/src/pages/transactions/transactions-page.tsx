import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorBoundaryFallback from '@/components/error-boundary-fallback';
import useDebounce from '@/hooks/use-debounce';
import useGetCombinedTransactions from '@/hooks/api/use-get-combined-transactions';
import { AddIndividualTranscationDialog } from './add-individual-transaction/add-indvidual-transaction-dialog';
import { AddTransactionGroupDialog } from './add-transaction-group/add-transaction-group-dialog';
import { AddTransactionDropdown } from './add-transaction-dropdown';
import TransactionsList from './transactions-list';
import { BulkActionBar } from './bulk-action-bar';
import { GroupSelectedDialog } from './group-selected-dialog';
import { useTransactionSelectionStore } from '@/hooks/store/use-transaction-selection-store';
import useDeleteTransaction from '@/hooks/api/use-delete-transaction';
import useDeleteTransactionGroup from '@/hooks/api/use-delete-transaction-group';
import { useAuthUserId } from '@/hooks/use-auth';

export default function TransactionsPage() {
  const userId = useAuthUserId();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [showIndividualDialog, setShowIndividualDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showGroupSelectedDialog, setShowGroupSelectedDialog] = useState(false);

  const { isSelecting, selectedItems, exitSelectionMode } = useTransactionSelectionStore();
  const deleteTransaction = useDeleteTransaction(userId);
  const deleteTransactionGroup = useDeleteTransactionGroup(userId);

  // Clear selection state when navigating away from the page
  useEffect(() => () => exitSelectionMode(), [exitSelectionMode]);

  // Get allItems directly from the same query hook (shared cache via queryKey)
  const { data } = useGetCombinedTransactions(userId, debouncedQuery);
  const allItems = useMemo(() => data?.pages.flatMap(p => p.results) ?? [], [data]);

  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);

  const handleBulkDelete = useCallback(async () => {
    setBulkDeleteError(null);
    const entries = Array.from(selectedItems.entries());
    const promises = entries.map(([id, type]) =>
      type === 'individual'
        ? deleteTransaction.mutateAsync(id)
        : deleteTransactionGroup.mutateAsync(id),
    );

    const results = await Promise.allSettled(promises);
    const failureCount = results.filter((r) => r.status === 'rejected').length;

    if (failureCount > 0) {
      setBulkDeleteError(
        `Failed to delete ${failureCount} of ${results.length} item${results.length !== 1 ? 's' : ''}. Please try again.`,
      );
    }

    exitSelectionMode();
  }, [selectedItems, deleteTransaction, deleteTransactionGroup, exitSelectionMode]);

  const handleBulkGroup = useCallback(() => {
    setShowGroupSelectedDialog(true);
  }, []);

  const selectedTransactionIds = useMemo(
    () => Array.from(selectedItems.entries())
      .filter(([, type]) => type === 'individual')
      .map(([id]) => id),
    [selectedItems],
  );

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Transactions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex items-center gap-2 px-4 mb-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <AddTransactionDropdown
          onAddIndividual={() => setShowIndividualDialog(true)}
          onAddGroup={() => setShowGroupDialog(true)}
        />
      </div>

      {bulkDeleteError && (
        <div className="px-4 mb-2">
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm text-destructive flex items-center justify-between">
            <span>{bulkDeleteError}</span>
            <button type="button" className="ml-2 text-destructive/60 hover:text-destructive" onClick={() => setBulkDeleteError(null)}>✕</button>
          </div>
        </div>
      )}

      {isSelecting && selectedItems.size > 0 && (
        <div className="px-4 mb-2">
          <BulkActionBar
            onDeleteSelected={handleBulkDelete}
            onGroupSelected={handleBulkGroup}
          />
        </div>
      )}

      <div className="px-4">
        <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
          <TransactionsList
            query={debouncedQuery}
            onAddTransaction={() => setShowIndividualDialog(true)}
          />
        </ErrorBoundary>
      </div>

      <AddIndividualTranscationDialog
        open={showIndividualDialog}
        onOpenChange={setShowIndividualDialog}
      />
      <AddTransactionGroupDialog
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
      />
      <GroupSelectedDialog
        open={showGroupSelectedDialog}
        onOpenChange={setShowGroupSelectedDialog}
        selectedTransactionIds={selectedTransactionIds}
        allItems={allItems}
      />
    </>
  );
}
