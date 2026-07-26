import { useState } from "react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AsyncBoundary } from "@/components/async-boundary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useUserId } from "@/hooks/use-auth";
import { useGetUserAccounts } from "@/hooks/api/use-user-account-api";
import {
  useCreateBinding,
  useDeleteBinding,
  useGetBindings,
  useGetConnections,
  useGetProviderAccounts,
  useGetProviderAccountTransactions,
  useRevokeConnection,
  useUpdateBinding,
} from "@/hooks/api/use-connectors-api";

function ConnectionDetail({ connectionId }: { connectionId: string }) {
  const userId = useUserId();
  const { data: connections } = useGetConnections(userId);
  const { data: bindings } = useGetBindings(userId);
  const { data: accounts } = useGetUserAccounts(userId);
  const { data: providerAccounts } = useGetProviderAccounts(
    userId,
    connectionId,
  );
  const updateBinding = useUpdateBinding(userId);
  const deleteBinding = useDeleteBinding(userId);
  const createBinding = useCreateBinding(userId);
  const revoke = useRevokeConnection(userId);
  const navigate = useNavigate();

  const connection = connections.find((c) => c.id === connectionId);
  const own = bindings.filter((b) => b.connection_id === connectionId);
  const accountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? "Unknown account";

  const [providerAccountId, setProviderAccountId] = useState("");
  const [svertoAccountId, setSvertoAccountId] = useState("");
  const [previewAccount, setPreviewAccount] = useState<
    (typeof providerAccounts)[number] | null
  >(null);

  if (!connection) return <p>Connection not found.</p>;

  return (
    <div className="space-y-4">
      <p>
        {connection.provider_kind} — {connection.credential_mode} —{" "}
        {connection.status}
      </p>
      <ul className="space-y-2">
        {own.map((b) => (
          <li key={b.id} className="border p-2">
            {b.provider_account_id} → {accountName(b.sverto_account_id)}
            {" · "}
            {b.last_sync_at
              ? `last synced ${new Date(b.last_sync_at * 1000).toLocaleString()}`
              : "never synced"}
            {b.last_sync_error && (
              <span className="text-destructive"> · {b.last_sync_error}</span>
            )}
            <label className="ml-4">
              <input
                type="checkbox"
                checked={b.write_mode === "trusted"}
                onChange={(e) =>
                  updateBinding.mutate({
                    bindingId: b.id,
                    writeMode: e.target.checked ? "trusted" : "ghost",
                    status: b.status === "paused" ? "paused" : "active",
                  })
                }
              />{" "}
              Trusted writes (off = imports arrive as ghosts pending review)
            </label>
            <label className="ml-4">
              <input
                type="checkbox"
                checked={b.status !== "paused"}
                onChange={(e) =>
                  updateBinding.mutate({
                    bindingId: b.id,
                    writeMode: b.write_mode === "trusted" ? "trusted" : "ghost",
                    status: e.target.checked ? "active" : "paused",
                  })
                }
              />{" "}
              Enabled
            </label>
            <button
              className="ml-4 text-destructive"
              onClick={() => deleteBinding.mutate(b.id)}
            >
              Delete binding
            </button>
          </li>
        ))}
      </ul>
      <div>
        <h3>Provider accounts</h3>
        <ul className="space-y-1">
          {providerAccounts.map((p) => (
            <li key={p.provider_account_id}>
              <button
                className="underline"
                onClick={() => setPreviewAccount(p)}
              >
                {p.display_name}
              </button>
              {p.currency ? ` · ${p.currency}` : ""}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3>Add binding</h3>
        <select
          value={providerAccountId}
          onChange={(e) => setProviderAccountId(e.target.value)}
        >
          <option value="">Provider account…</option>
          {providerAccounts.map((p) => (
            <option key={p.provider_account_id} value={p.provider_account_id}>
              {p.display_name}
            </option>
          ))}
        </select>
        <select
          value={svertoAccountId}
          onChange={(e) => setSvertoAccountId(e.target.value)}
        >
          <option value="">Sverto account…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button
          disabled={!providerAccountId || !svertoAccountId}
          onClick={() =>
            createBinding.mutate({
              connectionId,
              svertoAccountId,
              providerAccountId,
            })
          }
        >
          Link
        </button>
      </div>
      <button
        className="text-destructive"
        onClick={async () => {
          if (confirm("Revoke this connection?")) {
            await revoke.mutateAsync(connectionId);
            navigate({ to: "/settings/connectors" });
          }
        }}
      >
        Revoke connection
      </button>
      <Dialog
        open={previewAccount !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewAccount(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewAccount?.display_name}</DialogTitle>
          </DialogHeader>
          {previewAccount && (
            <div className="max-h-96 overflow-y-auto">
              <AsyncBoundary>
                <AccountTransactionsList
                  connectionId={connectionId}
                  providerAccountId={previewAccount.provider_account_id}
                />
              </AsyncBoundary>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountTransactionsList({
  connectionId,
  providerAccountId,
}: {
  connectionId: string;
  providerAccountId: string;
}) {
  const userId = useUserId();
  const { data: transactions } = useGetProviderAccountTransactions(
    userId,
    connectionId,
    providerAccountId,
  );
  if (transactions.length === 0) return <p>No transactions fetched yet.</p>;
  return (
    <ul className="space-y-1">
      {transactions.map((t, i) => (
        <li key={i} className="flex justify-between gap-4 border-b py-1">
          <span>
            {new Date(t.date * 1000).toLocaleDateString()} — {t.description}
          </span>
          <span className="whitespace-nowrap">
            {t.amount} {t.currency}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ConnectionDetailPage() {
  const { connectionId } = useParams({
    from: "/_auth/settings/connectors/connections/$connectionId",
  });
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/settings/connectors">
                  Connected Services
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Connection</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="p-4">
        <AsyncBoundary>
          <ConnectionDetail connectionId={connectionId} />
        </AsyncBoundary>
      </div>
    </>
  );
}
