import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUserId } from "@/hooks/use-auth";
import { useCreateConnection } from "@/hooks/api/use-connectors-api";

export function Trading212Connect() {
  const userId = useUserId();
  const createConnection = useCreateConnection(userId);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"stored" | "transient" | "client_supplied">(
    "stored",
  );
  const [apiKeyId, setApiKeyId] = useState("");
  const [apiKey, setApiKey] = useState("");

  const explanations = {
    stored:
      "Your API key is encrypted and kept on Sverto's servers; background sync works.",
    transient:
      "Your API key is kept only in this browser (localStorage) and sent with each sync you trigger. Other devices/browsers need their own key.",
    client_supplied:
      "Coming soon — your device fetches Trading 212 data directly and uploads it.",
  } as const;

  const submit = async () => {
    const conn = await createConnection.mutateAsync({
      provider_kind: "trading212",
      credential_mode: mode,
      credential: mode === "stored" ? apiKey : undefined,
      provider_key_id: apiKeyId || undefined,
    });
    const connectionId = conn.data.connection_id;
    if (mode === "transient") {
      localStorage.setItem(`t212_key_${connectionId}`, apiKey);
    }
    navigate({
      to: "/settings/connectors/connections/$connectionId",
      params: { connectionId },
    });
  };

  return (
    <div className="space-y-2">
      {(["stored", "transient", "client_supplied"] as const).map((m) => (
        <label key={m} className="mr-4">
          <input
            type="radio"
            checked={mode === m}
            onChange={() => setMode(m)}
          />{" "}
          {m === "stored"
            ? "Stored"
            : m === "transient"
              ? "On-device"
              : "Client-driven"}
        </label>
      ))}
      <p>{explanations[mode]}</p>
      {mode !== "client_supplied" && (
        <>
          <input
            placeholder="API key ID"
            value={apiKeyId}
            onChange={(e) => setApiKeyId(e.target.value)}
          />
          <input
            placeholder="API key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </>
      )}
      <button
        disabled={
          mode === "client_supplied" || !apiKey || createConnection.isPending
        }
        onClick={submit}
      >
        {mode === "client_supplied" ? "Coming soon" : "Connect"}
      </button>
    </div>
  );
}
