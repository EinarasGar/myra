import { Suspense, useState } from "react";
import { useAuthUserId } from "@/hooks/use-auth";
import {
  useGetUserAccounts,
  useCreateAccount,
  useUpdateAccount,
} from "@/hooks/api/use-user-account-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpandedAccount, AccountType, LiquidityType } from "@/types/account";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { DeleteAccountDialog } from "./delete-account-dialog";
import AccountTypePicker from "@/components/feature/account-type-picker";
import AccountLiquidityTypePicker from "@/components/feature/account-liquidity-type-picker";

interface FormState {
  id: string | null;
  name: string;
  accountType: AccountType | null;
  liquidityType: LiquidityType | null;
  ownershipShare: number;
}

const INITIAL_FORM_STATE: FormState = {
  id: null,
  name: "",
  accountType: null,
  liquidityType: null,
  ownershipShare: 100,
};

interface AccountsCardContentProps {
  isAdding: boolean;
  setIsAdding: (isAdding: boolean) => void;
}

export function AccountsCardContent({
  isAdding,
  setIsAdding,
}: AccountsCardContentProps) {
  const userId = useAuthUserId();
  const [deleteAccount, setDeleteAccount] = useState<ExpandedAccount | null>(
    null,
  );

  const [addingForm, setAddingForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [editing, setEditing] = useState<FormState>(INITIAL_FORM_STATE);

  const { data: accounts } = useGetUserAccounts(userId);
  const createAccount = useCreateAccount(userId);
  const updateAccount = useUpdateAccount(userId);

  const startEditing = (account: ExpandedAccount) => {
    setIsAdding(false);
    setAddingForm(INITIAL_FORM_STATE);
    setEditing({
      id: account.id,
      name: account.name,
      accountType: account.accountType ?? null,
      liquidityType: account.liquidityType ?? null,
      ownershipShare: (account.ownershipShare ?? 1) * 100,
    });
  };

  const cancelEditing = () => {
    setEditing(INITIAL_FORM_STATE);
  };

  const handleUpdate = async () => {
    if (
      !editing.id ||
      !editing.name.trim() ||
      !editing.accountType ||
      !editing.liquidityType
    ) {
      return;
    }
    await updateAccount.mutateAsync({
      accountId: editing.id,
      data: {
        name: editing.name.trim(),
        account_type: editing.accountType.id,
        liquidity_type: editing.liquidityType.id,
        ownership_share: editing.ownershipShare / 100,
      },
    });
    cancelEditing();
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setAddingForm(INITIAL_FORM_STATE);
  };

  const handleAdd = async () => {
    if (
      !addingForm.name.trim() ||
      !addingForm.accountType ||
      !addingForm.liquidityType
    ) {
      return;
    }
    await createAccount.mutateAsync({
      name: addingForm.name.trim(),
      account_type: addingForm.accountType.id,
      liquidity_type: addingForm.liquidityType.id,
      ownership_share: addingForm.ownershipShare / 100,
    });
    cancelAdding();
  };

  const isAddValid =
    addingForm.name.trim() !== "" &&
    addingForm.accountType !== null &&
    addingForm.liquidityType !== null;

  const isEditValid =
    editing.name.trim() !== "" &&
    editing.accountType !== null &&
    editing.liquidityType !== null;

  return (
    <>
      <div className="space-y-2 max-h-[500px] overflow-auto">
        {/* Add new account row */}
        {isAdding && (
          <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
            <Input
              value={addingForm.name}
              onChange={(e) =>
                setAddingForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Account name..."
              className="h-8 flex-1"
              maxLength={100}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && isAddValid) handleAdd();
                if (e.key === "Escape") cancelAdding();
              }}
            />

            <Suspense fallback={<Skeleton className="h-8 w-36 shrink-0" />}>
              <AccountTypePicker
                value={addingForm.accountType}
                onChange={(accountType) =>
                  setAddingForm((prev) => ({ ...prev, accountType }))
                }
                className="w-36 shrink-0"
              />
            </Suspense>

            <Suspense fallback={<Skeleton className="h-8 w-36 shrink-0" />}>
              <AccountLiquidityTypePicker
                value={addingForm.liquidityType}
                onChange={(liquidityType) =>
                  setAddingForm((prev) => ({ ...prev, liquidityType }))
                }
                className="w-36 shrink-0"
              />
            </Suspense>

            <div className="flex items-center gap-1 w-20 shrink-0">
              <Input
                type="number"
                min={1}
                max={100}
                value={addingForm.ownershipShare}
                onChange={(e) =>
                  setAddingForm((prev) => ({
                    ...prev,
                    ownershipShare: Number(e.target.value),
                  }))
                }
                className="h-8"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleAdd}
              disabled={!isAddValid || createAccount.isPending}
            >
              {createAccount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={cancelAdding}
              disabled={createAccount.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Account list */}
        {accounts?.map((account) => {
          const isEditing = editing.id === account.id;

          return (
            <div
              key={account.id}
              className="flex items-center gap-2 p-2 rounded-md border"
            >
              {isEditing ? (
                <>
                  <Input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="h-8 flex-1"
                    maxLength={100}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isEditValid) handleUpdate();
                      if (e.key === "Escape") cancelEditing();
                    }}
                  />

                  <Suspense
                    fallback={<Skeleton className="h-8 w-36 shrink-0" />}
                  >
                    <AccountTypePicker
                      value={editing.accountType}
                      onChange={(accountType) =>
                        setEditing((prev) => ({ ...prev, accountType }))
                      }
                      className="w-36 shrink-0"
                    />
                  </Suspense>

                  <Suspense
                    fallback={<Skeleton className="h-8 w-36 shrink-0" />}
                  >
                    <AccountLiquidityTypePicker
                      value={editing.liquidityType}
                      onChange={(liquidityType) =>
                        setEditing((prev) => ({ ...prev, liquidityType }))
                      }
                      className="w-36 shrink-0"
                    />
                  </Suspense>

                  <div className="flex items-center gap-1 w-20 shrink-0">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={editing.ownershipShare}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          ownershipShare: Number(e.target.value),
                        }))
                      }
                      className="h-8"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleUpdate}
                    disabled={!isEditValid || updateAccount.isPending}
                  >
                    {updateAccount.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={cancelEditing}
                    disabled={updateAccount.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1">{account.name}</span>

                  <span className="text-sm text-muted-foreground shrink-0">
                    {account.accountType?.name}
                  </span>

                  <span className="text-sm text-muted-foreground shrink-0">
                    {account.liquidityType?.name}
                  </span>

                  {account.ownershipShare < 1 && (
                    <span className="text-sm text-muted-foreground shrink-0">
                      {Math.round(account.ownershipShare * 100)}%
                    </span>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEditing(account)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteAccount(account)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {accounts?.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No accounts yet
          </p>
        )}
      </div>

      <DeleteAccountDialog
        account={deleteAccount}
        open={deleteAccount !== null}
        onOpenChange={(open) => !open && setDeleteAccount(null)}
      />
    </>
  );
}
