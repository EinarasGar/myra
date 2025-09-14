import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionTypeSelector } from "./transaction-type-selector";
import { useState } from "react";
import AddTransactionForm from "./add-transaction-from";

export function AddIndividualTranscationDialog() {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add new transaction</DialogTitle>
          <DialogDescription>Select transaction type.</DialogDescription>
        </DialogHeader>
        {!selectedType && (
          <TransactionTypeSelector
            onSelected={(type) => setSelectedType(type)}
          />
        )}
        {selectedType && <AddTransactionForm type={selectedType} />}
        {/* <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
