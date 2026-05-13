import { useRef } from "react";
import { Plus, Receipt, Layers, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface AddTransactionDropdownProps {
  onAddIndividual: () => void;
  onAddGroup: () => void;
  onQuickSnap: (file: File) => void;
}

export function AddTransactionDropdown({
  onAddIndividual,
  onAddGroup,
  onQuickSnap,
}: AddTransactionDropdownProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
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
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Camera className="h-4 w-4 mr-2" /> Quick Snap
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onQuickSnap(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
