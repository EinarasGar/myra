import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteAccount } from "@/hooks/api/use-user-account-api";
import { ExpandedAccount } from "@/types/account";
import { useAuthUserId } from "@/hooks/use-auth";

interface DeleteAccountDialogProps {
  account: ExpandedAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
  account,
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const userId = useAuthUserId();
  const deleteAccount = useDeleteAccount(userId);

  const handleDelete = async () => {
    if (!account) return;

    try {
      await deleteAccount.mutateAsync(account.id);
      onOpenChange(false);
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the account "{account?.name}"? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteAccount.isPending}
          >
            {deleteAccount.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
