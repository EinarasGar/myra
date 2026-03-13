import { TransactionTypeGroups } from "@/constants/transaction-types";

interface TransactionTypeSelectorProps {
  onSelected: (key: string) => void;
}

export function TransactionTypeSelector({
  onSelected,
}: TransactionTypeSelectorProps) {
  return (
    <div className="flex flex-col gap-5">
      {TransactionTypeGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {group.types.map((type) => (
              <button
                key={type.key}
                onClick={() => onSelected(type.key)}
                className="flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium">{type.label}</span>
                <span className="text-xs text-muted-foreground">
                  {type.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
