import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountIdentifiersEditor } from "@/components/feature/account-identifiers-editor";
import {
  useGetAccount,
  useUpdateAccount,
} from "@/hooks/api/use-user-account-api";
import { useUserId } from "@/hooks/use-auth";
import { AccountIdentifier } from "@/types/account";

export default function AccountIdentifiers({
  accountId,
}: {
  accountId: string;
}) {
  const userId = useUserId();
  const { data: account } = useGetAccount(userId, accountId);
  const updateAccount = useUpdateAccount(userId);

  const original: AccountIdentifier[] = account.identifiers ?? [];
  const [identifiers, setIdentifiers] = useState<AccountIdentifier[]>(original);
  const [serverError, setServerError] = useState<string | null>(null);

  const dirty = JSON.stringify(identifiers) !== JSON.stringify(original);

  const save = async () => {
    setServerError(null);
    try {
      await updateAccount.mutateAsync({
        accountId,
        data: {
          name: account.name,
          account_type: account.account_type.id,
          liquidity_type: account.liquidity_type.id,
          ownership_share: account.ownership_share,
          identifiers,
        },
      });
    } catch {
      setServerError(
        "Couldn't save. An identifier may already be linked to another account.",
      );
    }
  };

  return (
    <Card className="m-4">
      <CardHeader className="border-b py-5">
        <CardTitle>Account identifiers</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-6">
        <AccountIdentifiersEditor value={identifiers} onChange={setIdentifiers} />
        {serverError && (
          <span className="text-sm text-destructive">{serverError}</span>
        )}
        <div>
          <Button
            onClick={save}
            disabled={!dirty || updateAccount.isPending}
            size="sm"
          >
            Save identifiers
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
