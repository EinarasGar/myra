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
import AssetPicker from "@/components/feature/asset-picker";
import type { ExpandedAsset } from "@/types/assets";
import usePostAssetPair from "@/hooks/api/use-post-asset-pair";
import { useAuthUserId } from "@/hooks/use-auth";
import axios from "axios";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: number;
  onPairAdded?: (referenceId: number) => void;
}

export default function AddPairDialog({
  open,
  onOpenChange,
  assetId,
  onPairAdded,
}: Props) {
  const userId = useAuthUserId();
  const mutation = usePostAssetPair(userId, assetId);
  const [selectedAsset, setSelectedAsset] = useState<ExpandedAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    if (!selectedAsset) {
      setError("Please select a reference asset.");
      return;
    }
    mutation.mutate(
      { reference_id: selectedAsset.id },
      {
        onSuccess: () => {
          const refId = selectedAsset.id;
          setSelectedAsset(null);
          setError(null);
          onOpenChange(false);
          onPairAdded?.(refId);
        },
        onError: (err) => {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            setError("This pair already exists.");
          } else {
            setError("Failed to add pair. Please try again.");
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Reference Pair</DialogTitle>
          <DialogDescription>
            Select a reference asset to pair with this asset.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <AssetPicker
            value={selectedAsset}
            onChange={setSelectedAsset}
            placeholder="Search for an asset..."
            showLabel={false}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Adding..." : "Add Pair"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
