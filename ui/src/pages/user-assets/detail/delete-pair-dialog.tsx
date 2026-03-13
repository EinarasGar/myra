import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useDeleteAssetPair from "@/hooks/api/use-delete-asset-pair";
import { useUserId } from "@/hooks/use-auth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: number;
  referenceId: number;
  referenceTicker?: string;
  onPairDeleted?: () => void;
}

export default function DeletePairDialog({
  open,
  onOpenChange,
  assetId,
  referenceId,
  referenceTicker,
  onPairDeleted,
}: Props) {
  const userId = useUserId();
  const mutation = useDeleteAssetPair(userId, assetId);

  const handleDelete = async () => {
    try {
      await mutation.mutateAsync(referenceId);
      onOpenChange(false);
      onPairDeleted?.();
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Pair</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the pair with{" "}
            {referenceTicker ? `"${referenceTicker}"` : "this reference asset"}?
            This will remove all associated rates and metadata. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
