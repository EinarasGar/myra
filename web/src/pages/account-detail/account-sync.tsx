import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUserId } from "@/hooks/use-auth";
import {
  useGetBindings,
  useGetConnections,
  useSyncBinding,
} from "@/hooks/api/use-connectors-api";

export function AccountSync({ accountId }: { accountId: string }) {
  const userId = useUserId();
  const { data: bindings } = useGetBindings(userId);
  const { data: connections } = useGetConnections(userId);
  const syncBinding = useSyncBinding(userId);
  const [message, setMessage] = useState<string | null>(null);

  const own = bindings.filter((b) => b.sverto_account_id === accountId);
  if (own.length === 0) return null;

  const lastSyncAt = own.reduce<number | null>((max, b) => {
    if (b.last_sync_at == null) return max;
    return max == null || b.last_sync_at > max ? b.last_sync_at : max;
  }, null);

  const sync = async () => {
    setMessage(null);
    let queued = 0;
    let imported = 0;
    for (const b of own.filter((b) => b.status === "active")) {
      const conn = connections.find((c) => c.id === b.connection_id);
      let credential: string | undefined;
      if (conn?.credential_mode === "transient") {
        credential =
          localStorage.getItem(`t212_key_${conn.id}`) ??
          window.prompt(
            "Enter your Trading 212 API key (stored only in this browser)",
          ) ??
          undefined;
        if (!credential) continue;
        localStorage.setItem(`t212_key_${conn.id}`, credential);
      }
      try {
        const res = await syncBinding.mutateAsync({
          bindingId: b.id,
          credential,
        });
        if (res.data.status === "queued") queued += 1;
        else imported += res.data.report?.new_transactions ?? 0;
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Sync failed");
        return;
      }
    }
    setMessage(
      queued > 0 && imported === 0
        ? "Sync started"
        : `${imported} new transactions`,
    );
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {lastSyncAt != null && (
        <span>
          Last synced {new Date(lastSyncAt * 1000).toLocaleString()}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={sync}
        disabled={syncBinding.isPending}
      >
        Sync
      </Button>
      {message && <span>{message}</span>}
    </div>
  );
}
