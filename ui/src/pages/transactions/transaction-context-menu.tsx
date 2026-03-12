import { MoreHorizontal, Trash2, CheckSquare, Check, ArrowRightToLine, ArrowLeftFromLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface TransactionContextMenuProps {
  onDelete: () => void;
  onSelect: () => void;
  onMoveToGroup?: () => void;
  onMoveOutOfGroup?: () => void;
}

export function TransactionContextMenu({ onDelete, onSelect, onMoveToGroup, onMoveOutOfGroup }: TransactionContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onSelect}>
          <CheckSquare className="h-4 w-4 mr-2" /> Select
        </DropdownMenuItem>
        {onMoveToGroup && (
          <DropdownMenuItem onClick={onMoveToGroup}>
            <ArrowRightToLine className="h-4 w-4 mr-2" /> Move selected here
          </DropdownMenuItem>
        )}
        {onMoveOutOfGroup && (
          <DropdownMenuItem onClick={onMoveOutOfGroup}>
            <ArrowLeftFromLine className="h-4 w-4 mr-2" /> Move out of group
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onDelete} variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Maps transaction type to a 2-letter abbreviation
function getTypeInitials(type: string): string {
  const initials: Record<string, string> = {
    asset_purchase: 'AB',
    asset_sale: 'AS',
    cash_transfer_in: 'CI',
    cash_transfer_out: 'CO',
    cash_dividend: 'DV',
    asset_dividend: 'DV',
    asset_trade: 'TR',
    asset_transfer_in: 'TI',
    asset_transfer_out: 'TO',
    asset_balance_transfer: 'BT',
    account_fees: 'FE',
    regular: 'TX',
  };
  return initials[type] ?? type.slice(0, 2).toUpperCase();
}

// Maps transaction type to a background color class
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    asset_purchase: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    asset_sale: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    cash_transfer_in: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    cash_transfer_out: 'bg-red-500/15 text-red-600 dark:text-red-400',
    cash_dividend: 'bg-green-500/15 text-green-600 dark:text-green-400',
    asset_dividend: 'bg-green-500/15 text-green-600 dark:text-green-400',
    asset_trade: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    asset_transfer_in: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    asset_transfer_out: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    asset_balance_transfer: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    account_fees: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
    regular: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
  };
  return colors[type] ?? 'bg-muted text-muted-foreground';
}

interface TransactionAvatarProps {
  type: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  isGroup?: boolean;
}

export function TransactionAvatar({ type, isSelected, onToggleSelect, isGroup }: TransactionAvatarProps) {
  const initials = isGroup ? 'GR' : getTypeInitials(type);
  const colorClass = isGroup ? 'bg-muted text-muted-foreground' : getTypeColor(type);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelect();
      }}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : colorClass,
        !isSelected && 'hover:ring-2 hover:ring-primary/30',
      )}
    >
      {isSelected ? <Check className="h-4 w-4" /> : initials}
    </button>
  );
}
