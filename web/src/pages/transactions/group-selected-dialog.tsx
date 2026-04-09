import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimeLanguagePicker } from "@/components/feature/date-time-language-picker";
import CategoryPicker from "@/components/feature/category-picker";
import { useUserId } from "@/hooks/use-auth";
import { useTransactionSelectionStore } from "@/hooks/store/use-transaction-selection-store";
import useGroupIndividualTransactions from "@/hooks/api/use-group-individual-transactions";
import type {
  CombinedTransactionItem,
  IdentifiableTransaction,
} from "@/api/api";
import type { Category } from "@/types/category";
import { findTransactionsByIds } from "./transaction-display-utils";

interface GroupSelectedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTransactionIds: string[];
  allItems: CombinedTransactionItem[];
}

export function GroupSelectedDialog({
  open,
  onOpenChange,
  selectedTransactionIds,
  allItems,
}: GroupSelectedDialogProps) {
  const userId = useUserId();
  const groupTransactions = useGroupIndividualTransactions(userId);
  const { exitSelectionMode } = useTransactionSelectionStore();

  const [selectedDate, setSelectedDate] = useState<Date>();
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setSelectedDate(undefined);
      setDescription("");
      setSelectedCategory(null);
    }
  };

  const handleSubmit = () => {
    if (!selectedDate || !selectedCategory) return;

    // Find selected transactions, searching both top-level items and group children
    const selectedTransactions: IdentifiableTransaction[] =
      findTransactionsByIds(
        allItems,
        selectedTransactionIds,
      ) as IdentifiableTransaction[];

    if (selectedTransactions.length === 0) return;

    groupTransactions.mutate(
      {
        date: Math.floor(selectedDate.getTime() / 1000),
        description,
        category_id: selectedCategory.id,
        transactions: selectedTransactions,
      },
      {
        onSuccess: () => {
          handleOpenChange(false);
          exitSelectionMode();
        },
      },
    );
  };

  const canSubmit =
    selectedDate && selectedCategory && selectedTransactionIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Group Selected Transactions</DialogTitle>
          <DialogDescription>
            Group {selectedTransactionIds.length} selected transaction
            {selectedTransactionIds.length !== 1 ? "s" : ""} into a new group.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <DateTimeLanguagePicker
            value={selectedDate}
            onChange={setSelectedDate}
          />
          <Input
            placeholder="Group description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <CategoryPicker
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || groupTransactions.isPending}
          >
            {groupTransactions.isPending ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
