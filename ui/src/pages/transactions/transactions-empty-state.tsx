import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionsEmptyStateProps {
  onAddTransaction: () => void;
}

export default function TransactionsEmptyState({
  onAddTransaction,
}: TransactionsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
      <p className="text-sm text-muted-foreground mb-6 text-center">
        Add your first transaction to start tracking your portfolio
      </p>
      <Button onClick={onAddTransaction}>
        <Plus className="h-4 w-4 mr-1" /> Add Transaction
      </Button>
    </div>
  );
}
