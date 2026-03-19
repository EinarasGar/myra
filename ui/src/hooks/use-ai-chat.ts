import axios from "axios";
import { useCallback, useRef, useState } from "react";

export type MessagePart =
  | { type: "text"; content: string }
  | {
      type: "tool_call";
      name: string;
      input: unknown;
      output?: string;
      state: "pending" | "complete";
    }
  | { type: "reasoning"; content: string };

export interface ChatMessage {
  role: "user" | "assistant";
  parts: MessagePart[];
}

export interface UseAiChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (message: string) => void;
  clearMessages: () => void;
}

function getTextContent(msg: ChatMessage): string {
  return msg.parts
    .filter((p): p is MessagePart & { type: "text" } => p.type === "text")
    .map((p) => p.content)
    .join("");
}

export default function useAiChat(userId: string): UseAiChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isStreaming) return;

      const userMessage: ChatMessage = {
        role: "user",
        parts: [{ type: "text", content: message }],
      };
      const assistantMessage: ChatMessage = { role: "assistant", parts: [] };

      const newMessages = [...messages, userMessage];
      setMessages([...newMessages, assistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = new URL(`/api/users/${userId}/ai/chat`, axios.defaults.baseURL || window.location.origin).toString();
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            history: newMessages.map((m) => ({
              role: m.role,
              content: getTextContent(m),
            })),
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              parts: [
                {
                  type: "text",
                  content: "Sorry, something went wrong. Please try again.",
                },
              ],
            };
            return updated;
          });
          setIsStreaming(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";
        let dataLines: string[] = [];

        const updateLastAssistant = (
          updater: (parts: MessagePart[]) => MessagePart[],
        ) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              parts: updater([...last.parts]),
            };
            return updated;
          });
        };

        const flushEvent = () => {
          if (dataLines.length === 0) return;
          const data = dataLines.join("\n");
          dataLines = [];

          if (currentEvent === "text") {
            updateLastAssistant((parts) => {
              const newParts = [...parts];
              const lastPart = newParts[newParts.length - 1];
              if (lastPart?.type === "text") {
                newParts[newParts.length - 1] = {
                  ...lastPart,
                  content: lastPart.content + data,
                };
              } else {
                newParts.push({ type: "text", content: data });
              }
              return newParts;
            });
          } else if (currentEvent === "tool_call") {
            try {
              const parsed = JSON.parse(data);
              updateLastAssistant((parts) => [
                ...parts,
                {
                  type: "tool_call" as const,
                  name: parsed.name,
                  input: parsed.input,
                  state: "pending" as const,
                },
              ]);
            } catch {
              /* malformed SSE data */
            }
          } else if (currentEvent === "tool_result") {
            try {
              const parsed = JSON.parse(data);
              updateLastAssistant((parts) =>
                parts.map((p) =>
                  p.type === "tool_call" && p.state === "pending"
                    ? { ...p, output: parsed.output, state: "complete" as const }
                    : p,
                ),
              );
            } catch {
              /* malformed SSE data */
            }
          } else if (currentEvent === "reasoning") {
            updateLastAssistant((parts) => {
              const newParts = [...parts];
              const lastPart = newParts[newParts.length - 1];
              if (lastPart?.type === "reasoning") {
                newParts[newParts.length - 1] = {
                  ...lastPart,
                  content: lastPart.content + data,
                };
              } else {
                newParts.push({ type: "reasoning", content: data });
              }
              return newParts;
            });
          } else if (currentEvent === "error") {
            updateLastAssistant((parts) => {
              parts.push({ type: "text", content: `Error: ${data}` });
              return parts;
            });
          }
          currentEvent = "";
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              flushEvent();
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataLines.push(line.slice(6));
            } else if (line === "") {
              flushEvent();
            }
          }
        }
        flushEvent();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              parts: [
                {
                  type: "text",
                  content: "Sorry, the request failed. Please try again.",
                },
              ],
            };
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, userId, isStreaming],
  );

  const clearMessages = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, sendMessage, clearMessages };
}
