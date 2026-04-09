import { Button } from "@/components/ui/button";
import { Trash2, Layers, X } from "lucide-react";
import { useTransactionSelectionStore } from "@/hooks/store/use-transaction-selection-store";

interface BulkActionBarProps {
  onDeleteSelected: () => void;
  onGroupSelected: () => void;
}

export function BulkActionBar({
  onDeleteSelected,
  onGroupSelected,
}: BulkActionBarProps) {
  const { selectedItems, exitSelectionMode } = useTransactionSelectionStore();
  const count = selectedItems.size;
  const allIndividual = Array.from(selectedItems.values()).every(
    (t) => t === "individual",
  );

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border rounded-md">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="flex-1" />
      <Button
        variant="outline"
        size="sm"
        onClick={onGroupSelected}
        disabled={!allIndividual || count < 2}
      >
        <Layers className="h-4 w-4 mr-1" /> Group Selected
      </Button>
      <Button variant="destructive" size="sm" onClick={onDeleteSelected}>
        <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
      </Button>
      <Button variant="ghost" size="sm" onClick={exitSelectionMode}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
