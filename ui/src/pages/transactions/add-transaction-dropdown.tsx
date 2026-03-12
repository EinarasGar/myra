import { Plus, Receipt, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface AddTransactionDropdownProps {
  onAddIndividual: () => void;
  onAddGroup: () => void;
}

export function AddTransactionDropdown({ onAddIndividual, onAddGroup }: AddTransactionDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button />}>
        <Plus className="h-4 w-4 mr-1" /> Add
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onAddIndividual}>
          <Receipt className="h-4 w-4 mr-2" /> Individual Transaction
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddGroup}>
          <Layers className="h-4 w-4 mr-2" /> Transaction Group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
