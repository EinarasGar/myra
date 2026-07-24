import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useCompleteOAuthSession } from "@/hooks/api/use-connectors-api";
import { useUserId } from "@/hooks/use-auth";

export const Route = createFileRoute(
  "/_auth/settings/connectors/truelayer/callback",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    code: (search.code as string) ?? undefined,
    state: (search.state as string) ?? undefined,
    error: (search.error as string) ?? undefined,
  }),
});

function RouteComponent() {
  const { code, state, error } = Route.useSearch();
  const userId = useUserId();
  const complete = useCompleteOAuthSession(userId);
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing connection…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const pending = sessionStorage.getItem("connector_oauth_pending");
    if (!pending || !state) {
      setMessage(
        "No pending connection found. Start again from Connected Services.",
      );
      return;
    }
    const { connectionId, sessionId } = JSON.parse(pending) as {
      connectionId: string;
      sessionId: string;
    };
    complete
      .mutateAsync({ connectionId, sessionId, state, code, error })
      .then((res) => {
        sessionStorage.removeItem("connector_oauth_pending");
        if (res.data.status === "denied") {
          setMessage("Access was denied at the bank. You can try again.");
        } else {
          navigate({
            to: "/settings/connectors/connections/$connectionId",
            params: { connectionId },
          });
        }
      })
      .catch((e) => setMessage(e?.message ?? "Failed to complete connection."));
  }, [code, state, error, complete, navigate]);

  return <p className="p-4">{message}</p>;
}
