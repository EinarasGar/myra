import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateTimeLanguagePicker } from '@/components/feature/date-time-language-picker';
import CategoryPicker from '@/components/feature/category-picker';
import { Plus, X } from 'lucide-react';
import { useAuthUserId } from '@/hooks/use-auth';
import { useAddTransactionGroup } from '@/hooks/api/use-add-transaction-group';
import { AddSubTransactionDialog } from './add-sub-transaction-dialog';
import { TransactionTypeGroups } from '@/constants/transaction-types';
import type { TransactionInput } from '@/api';
import type { Category } from '@/types/category';

interface CollectedTransaction {
  id: string;
  input: TransactionInput;
  summary: {
    type: string;
    description: string;
  };
}

interface AddTransactionGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to find label for transaction type
function getTypeLabel(type: string): string {
  for (const group of TransactionTypeGroups) {
    for (const t of group.types) {
      if (t.key === type) return t.label;
    }
  }
  // Handle 'regular' which maps to 'regular_transaction' in groups
  if (type === 'regular') return 'Purchase';
  return type;
}

export function AddTransactionGroupDialog({ open, onOpenChange }: AddTransactionGroupDialogProps) {
  const userId = useAuthUserId();
  const addGroup = useAddTransactionGroup(userId);

  const [selectedDate, setSelectedDate] = useState<Date>();
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [transactions, setTransactions] = useState<CollectedTransaction[]>([]);
  const [showSubDialog, setShowSubDialog] = useState(false);

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setSelectedDate(undefined);
      setDescription('');
      setSelectedCategory(null);
      setTransactions([]);
    }
  };

  const handleCollectTransaction = (input: TransactionInput) => {
    const collected: CollectedTransaction = {
      id: crypto.randomUUID(),
      input,
      summary: {
        type: getTypeLabel(input.type),
        description: 'description' in input && input.description ? String(input.description) : getTypeLabel(input.type),
      },
    };
    setTransactions(prev => [...prev, collected]);
  };

  const handleRemoveTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleCreate = () => {
    if (!selectedDate || !selectedCategory || transactions.length === 0) return;

    addGroup.mutate(
      {
        date: Math.floor(selectedDate.getTime() / 1000),
        description,
        category_id: selectedCategory.id,
        transactions: transactions.map(t => t.input),
      },
      {
        onSuccess: () => handleOpenChange(false),
      },
    );
  };

  const canCreate = selectedDate && selectedCategory && transactions.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Transaction Group</DialogTitle>
            <DialogDescription>Group related transactions together.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <DateTimeLanguagePicker value={selectedDate} onChange={setSelectedDate} />
            <Input
              placeholder="Group description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <CategoryPicker value={selectedCategory} onChange={setSelectedCategory} />

            {/* Sub-transactions list */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Transactions ({transactions.length})</span>
              {transactions.map((tx, index) => (
                <div key={tx.id} className="flex items-center gap-2 rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">{index + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{tx.summary.description}</span>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{tx.summary.type}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveTransaction(tx.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="border-dashed" onClick={() => setShowSubDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Transaction
              </Button>
            </div>

            {/* Summary */}
            {transactions.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!canCreate || addGroup.isPending}>
              {addGroup.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddSubTransactionDialog
        open={showSubDialog}
        onOpenChange={setShowSubDialog}
        onCollect={handleCollectTransaction}
      />
    </>
  );
}
