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
import AddAssetPurchaseForm from "./add-asset-purchase-form";

export function AddIndividualTranscationDialog() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setSelectedType(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        Edit Profile
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
        {selectedType === "asset_purchase" && (
          <AddAssetPurchaseForm
            onSuccess={() => handleOpenChange(false)}
          />
        )}
        {selectedType && selectedType !== "asset_purchase" && (
          <AddTransactionForm
            type={selectedType}
            onSuccess={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
