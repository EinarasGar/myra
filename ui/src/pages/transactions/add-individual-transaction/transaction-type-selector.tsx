import { Button } from "@/components/ui/button";
import { TransactionTypes } from "@/constants/transaction-types";

interface TransactionTypeSelectorProps {
  onSelected: (key: string) => void;
}

export function TransactionTypeSelector({
  onSelected: onSelected,
}: TransactionTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {Object.values(TransactionTypes).map((type) => (
        <Button
          key={type.key}
          variant="outline"
          onClick={() => onSelected(type.key)}
        >
          {type.label}
        </Button>
      ))}
    </div>
  );
}
