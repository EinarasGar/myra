import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimeLanguagePicker } from "@/components/feature/date-time-language-picker";
import usePostUserAssetRate from "@/hooks/api/use-post-user-asset-rate";
import { useAuthUserId } from "@/hooks/use-auth";
import axios from "axios";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: number;
  referenceId: number;
}

export default function AddRateDialog({
  open,
  onOpenChange,
  assetId,
  referenceId,
}: Props) {
  const userId = useAuthUserId();
  const mutation = usePostUserAssetRate(userId, assetId, referenceId);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    const rateNum = parseFloat(rate);
    if (isNaN(rateNum) || rateNum <= 0) {
      setError("Rate must be a positive number.");
      return;
    }
    if (!date) {
      setError("Please select a date.");
      return;
    }
    const dateTimestamp = Math.floor(date.getTime() / 1000);
    mutation.mutate(
      { rates: [{ rate: rateNum, date: dateTimestamp }] },
      {
        onSuccess: () => {
          setDate(undefined);
          setRate("");
          setError(null);
          onOpenChange(false);
        },
        onError: (err) => {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            setError("A rate for this date already exists.");
          } else {
            setError("Failed to add rate. Please try again.");
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Rate</DialogTitle>
          <DialogDescription>
            Add a new rate entry for this asset pair.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <DateTimeLanguagePicker value={date} onChange={setDate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate-value">Rate</Label>
            <Input
              id="rate-value"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Adding..." : "Add Rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
