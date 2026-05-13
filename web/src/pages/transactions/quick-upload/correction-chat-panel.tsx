import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AIQuickUploadApiFactory } from "@/api";
import { useUserId } from "@/hooks/use-auth";
import { QueryKeys } from "@/constants/query-keys";

interface CorrectionChatPanelProps {
  quickUploadId: string;
}

interface ChatLine {
  role: "user" | "system";
  text: string;
}

export function CorrectionChatPanel({
  quickUploadId,
}: CorrectionChatPanelProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [history, setHistory] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [waitingSince, setWaitingSince] = useState<string | null>(null);

  const { data: detail } = useQuery({
    queryKey: [QueryKeys.QUICK_UPLOAD, quickUploadId],
    queryFn: async () =>
      (await AIQuickUploadApiFactory().getQuickUpload(userId, quickUploadId))
        .data,
  });

  useEffect(() => {
    if (!waitingSince || !detail) return;
    if (
      detail.updated_at !== waitingSince &&
      detail.status === "proposal_ready"
    ) {
      setWaitingSince(null);
      setHistory((h) => {
        const last = h[h.length - 1];
        if (last?.role === "system" && last.text === "Working on it…") {
          return [...h.slice(0, -1), { role: "system", text: "Updated." }];
        }
        return [...h, { role: "system", text: "Updated." }];
      });
    }
  }, [detail, waitingSince]);

  const send = async () => {
    const message = input.trim();
    if (!message || sending) return;
    setSending(true);
    setHistory((h) => [...h, { role: "user", text: message }]);
    setInput("");
    try {
      const before = detail?.updated_at ?? null;
      await AIQuickUploadApiFactory().sendCorrection(userId, quickUploadId, {
        message,
      });
      setHistory((h) => [...h, { role: "system", text: "Working on it…" }]);
      setWaitingSince(before);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.QUICK_UPLOADS, userId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.QUICK_UPLOAD, quickUploadId],
        }),
      ]);
    } catch {
      setHistory((h) => [...h, { role: "system", text: "Error." }]);
      setWaitingSince(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-2 min-h-[280px]">
      <div className="text-xs font-medium text-muted-foreground">
        Ask the AI to adjust this proposal
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 text-xs">
        {history.length === 0 && (
          <div className="text-muted-foreground italic">
            e.g. &quot;the date is March 7&quot; or &quot;category should be
            Groceries&quot;
          </div>
        )}
        {history.map((line, i) => (
          <div
            key={i}
            className={
              line.role === "user"
                ? "self-end bg-primary text-primary-foreground rounded px-2 py-1 max-w-[90%]"
                : "self-start text-muted-foreground"
            }
          >
            {line.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-end">
        <Textarea
          rows={2}
          placeholder="Tell the AI what to change…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={sending}
        />
        <Button size="icon" onClick={() => void send()} disabled={sending}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
