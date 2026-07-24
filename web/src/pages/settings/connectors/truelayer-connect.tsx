import { useUserId } from "@/hooks/use-auth";
import {
  useCreateConnection,
  useCreateOAuthSession,
} from "@/hooks/api/use-connectors-api";

const PENDING_KEY = "connector_oauth_pending";

export function TrueLayerConnect() {
  const userId = useUserId();
  const createConnection = useCreateConnection(userId);
  const createSession = useCreateOAuthSession(userId);

  const start = async () => {
    const conn = await createConnection.mutateAsync({
      provider_kind: "truelayer",
      credential_mode: "stored",
    });
    const connectionId = conn.data.connection_id;
    const session = await createSession.mutateAsync({
      connectionId,
      redirectUri: `${window.location.origin}/settings/connectors/truelayer/callback`,
    });
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ connectionId, sessionId: session.data.session_id }),
    );
    window.location.href = session.data.auth_url;
  };

  return (
    <div className="space-y-2">
      <p>
        You will be redirected to TrueLayer to choose your bank and approve
        access. Sverto never sees your bank credentials. Afterwards you return
        here and recent transactions are imported.
      </p>
      <button
        onClick={start}
        disabled={createConnection.isPending || createSession.isPending}
      >
        Connect your bank
      </button>
    </div>
  );
}
