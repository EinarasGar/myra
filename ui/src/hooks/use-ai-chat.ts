import axios from "axios";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { FileUIPart } from "ai";

export type { FileUIPart };

export type MessagePart =
  | { type: "text"; content: string }
  | {
      type: "tool_call";
      name: string;
      input: unknown;
      output?: string;
      errorText?: string;
      state:
        | "input-streaming"
        | "input-available"
        | "approval-requested"
        | "approval-responded"
        | "output-available"
        | "output-denied"
        | "output-error";
      callId?: string;
      signature?: string;
    }
  | { type: "reasoning"; content: string }
  | { type: "file"; file: FileUIPart };

export interface ChatMessage {
  role: "user" | "assistant";
  parts: MessagePart[];
}

export interface UseAiChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (message: string, files?: FileUIPart[]) => void;
  approveToolCall: (callId: string, approved: boolean) => void;
  clearMessages: () => void;
}

function getTextContent(msg: ChatMessage): string {
  return msg.parts
    .filter((p): p is MessagePart & { type: "text" } => p.type === "text")
    .map((p) => p.content)
    .join("");
}

type HistoryEntry = Record<string, unknown>;

function buildHistory(msgs: ChatMessage[]): HistoryEntry[] {
  const result: HistoryEntry[] = [];
  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i];
    if (msg.role === "user") {
      const text = getTextContent(msg);
      if (text) result.push({ type: "user", content: text });
    } else {
      for (let j = 0; j < msg.parts.length; j++) {
        const part = msg.parts[j];
        if (part.type === "text" && part.content) {
          result.push({ type: "assistant", content: part.content });
        } else if (part.type === "tool_call") {
          // Gemini requires thought_signature on all tool calls in history
          // when thinking is enabled. Skip tool calls without signatures
          // to avoid 400 errors — the LLM's text already has the context.
          if (!part.signature) continue;

          const tcId = part.callId ?? `tc-${i}-${j}-${part.name}`;
          result.push({
            type: "assistant_tool_call",
            tool_call_id: tcId,
            name: part.name,
            args: JSON.stringify(part.input),
            signature: part.signature,
          });
          if (part.output !== undefined) {
            result.push({
              type: "tool_result",
              tool_call_id: tcId,
              content: part.output,
            });
          }
        }
        // reasoning parts are not included in history
      }
    }
  }
  return result;
}

export default function useAiChat(userId: string): UseAiChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { getAccessToken } = useAuth();
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (message: string, files?: FileUIPart[]) => {
      if (!message.trim() || isStreaming) return;

      const fileParts: MessagePart[] = (files ?? []).map((f) => ({
        type: "file" as const,
        file: f,
      }));
      const userMessage: ChatMessage = {
        role: "user",
        parts: [...fileParts, { type: "text", content: message }],
      };
      const assistantMessage: ChatMessage = { role: "assistant", parts: [] };

      const newMessages = [...messages, userMessage];
      setMessages([...newMessages, assistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const base = axios.defaults.baseURL?.startsWith("http")
          ? axios.defaults.baseURL
          : window.location.origin;
        const url = new URL(`/api/users/${userId}/ai/chat`, base).toString();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const token = await getAccessToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            message,
            images: (files ?? []).map((f) => ({
              media_type: f.mediaType,
              data: f.url.replace(/^data:[^;]+;base64,/, ""),
            })),
            history: buildHistory(newMessages),
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
                  state: "input-available" as const,
                  callId: parsed.call_id as string | undefined,
                  signature: parsed.signature as string | undefined,
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
                  p.type === "tool_call" && p.state === "input-available"
                    ? {
                        ...p,
                        output: parsed.output,
                        state: "output-available" as const,
                      }
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
          } else if (currentEvent === "tool_request") {
            try {
              const parsed = JSON.parse(data) as {
                tool_call_id: string;
                name: string;
                args: unknown;
              };
              updateLastAssistant((parts) => {
                // Find existing tool_call by call_id, remove it, and append at end
                let existingIdx = -1;
                for (let i = parts.length - 1; i >= 0; i--) {
                  const p = parts[i];
                  if (
                    p.type === "tool_call" &&
                    p.callId === parsed.tool_call_id
                  ) {
                    existingIdx = i;
                    break;
                  }
                }
                if (existingIdx >= 0) {
                  const existing = parts[existingIdx];
                  if (existing.type === "tool_call") {
                    const without = parts.filter((_, i) => i !== existingIdx);
                    return [
                      ...without,
                      {
                        ...existing,
                        state: "approval-requested" as const,
                        callId: parsed.tool_call_id,
                        output: undefined,
                      },
                    ];
                  }
                }
                // Fallback: no existing part found, create new
                return [
                  ...parts,
                  {
                    type: "tool_call" as const,
                    name: parsed.name,
                    input: parsed.args,
                    state: "approval-requested" as const,
                    callId: parsed.tool_call_id,
                  },
                ];
              });
            } catch {
              /* malformed */
            }
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
    [messages, userId, isStreaming, getAccessToken],
  );

  const approveToolCall = useCallback(
    async (callId: string, approved: boolean) => {
      if (isStreaming) return;

      const currentMessages = messagesRef.current;

      // Find the assistant message with the matching callId tool_call part
      const assistantMsgIdx = currentMessages.findIndex(
        (m) =>
          m.role === "assistant" &&
          m.parts.some((p) => p.type === "tool_call" && p.callId === callId),
      );
      if (assistantMsgIdx < 0) return;

      // Update status in UI immediately
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === assistantMsgIdx
            ? {
                ...msg,
                parts: msg.parts.map((p) =>
                  p.type === "tool_call" && p.callId === callId
                    ? {
                        ...p,
                        state: approved
                          ? ("approval-responded" as const)
                          : ("output-denied" as const),
                      }
                    : p,
                ),
              }
            : msg,
        ),
      );

      // Build history: all messages up to and including the assistant message
      const history = buildHistory(
        currentMessages.slice(0, assistantMsgIdx + 1),
      );

      // Add the approval decision (tool call is already in history from buildHistory)
      history.push({
        type: "tool_approval",
        tool_call_id: callId,
        approved,
      });

      // For declined: add a new assistant message to stream into
      if (!approved) {
        const newAssistantMessage: ChatMessage = {
          role: "assistant",
          parts: [],
        };
        setMessages((prev) => [...prev, newAssistantMessage]);
      }

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      // The index to update: for approved, the existing assistant message; for declined, the last message
      const targetMsgIdx = approved ? assistantMsgIdx : -1; // -1 means last

      try {
        const base = axios.defaults.baseURL?.startsWith("http")
          ? axios.defaults.baseURL
          : window.location.origin;
        const url = new URL(`/api/users/${userId}/ai/chat`, base).toString();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const token = await getAccessToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ history }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          if (approved) {
            setMessages((prev) =>
              prev.map((msg, idx) =>
                idx === targetMsgIdx
                  ? {
                      ...msg,
                      parts: msg.parts.map((p) =>
                        p.type === "tool_call" && p.callId === callId
                          ? { ...p, state: "output-error" as const }
                          : p,
                      ),
                    }
                  : msg,
              ),
            );
          } else {
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
          }
          setIsStreaming(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";
        let dataLines: string[] = [];

        const updateTargetMessage = (
          updater: (parts: MessagePart[]) => MessagePart[],
        ) => {
          setMessages((prev) => {
            const updated = [...prev];
            const idx = targetMsgIdx >= 0 ? targetMsgIdx : updated.length - 1;
            const msg = updated[idx];
            updated[idx] = { ...msg, parts: updater([...msg.parts]) };
            return updated;
          });
        };

        const flushApprovalEvent = () => {
          if (dataLines.length === 0) return;
          const data = dataLines.join("\n");
          dataLines = [];

          if (currentEvent === "text") {
            updateTargetMessage((parts) => {
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
              updateTargetMessage((parts) => [
                ...parts,
                {
                  type: "tool_call" as const,
                  name: parsed.name,
                  input: parsed.input,
                  state: "input-available" as const,
                  callId: parsed.call_id as string | undefined,
                  signature: parsed.signature as string | undefined,
                },
              ]);
            } catch {
              /* malformed SSE data */
            }
          } else if (currentEvent === "tool_result") {
            try {
              const parsed = JSON.parse(data);
              updateTargetMessage((parts) =>
                parts.map((p) => {
                  if (p.type !== "tool_call") return p;
                  // If this is the gated tool that was approved, match by callId
                  if (
                    approved &&
                    p.callId === callId &&
                    p.state === "approval-responded"
                  ) {
                    return {
                      ...p,
                      output: parsed.output,
                      state: "output-available" as const,
                    };
                  }
                  // For regular tool calls (in declined flow), match by state
                  if (p.state === "input-available") {
                    return {
                      ...p,
                      output: parsed.output,
                      state: "output-available" as const,
                    };
                  }
                  return p;
                }),
              );
            } catch {
              /* malformed SSE data */
            }
          } else if (currentEvent === "reasoning") {
            updateTargetMessage((parts) => {
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
            updateTargetMessage((parts) => {
              parts.push({ type: "text", content: `Error: ${data}` });
              return parts;
            });
          } else if (currentEvent === "tool_request") {
            try {
              const parsed = JSON.parse(data) as {
                tool_call_id: string;
                name: string;
                args: unknown;
              };
              updateTargetMessage((parts) => {
                let existingIdx = -1;
                for (let i = parts.length - 1; i >= 0; i--) {
                  const p = parts[i];
                  if (
                    p.type === "tool_call" &&
                    p.callId === parsed.tool_call_id
                  ) {
                    existingIdx = i;
                    break;
                  }
                }
                if (existingIdx >= 0) {
                  const existing = parts[existingIdx];
                  if (existing.type === "tool_call") {
                    const without = parts.filter((_, i) => i !== existingIdx);
                    return [
                      ...without,
                      {
                        ...existing,
                        state: "approval-requested" as const,
                        callId: parsed.tool_call_id,
                        output: undefined,
                      },
                    ];
                  }
                }
                return [
                  ...parts,
                  {
                    type: "tool_call" as const,
                    name: parsed.name,
                    input: parsed.args,
                    state: "approval-requested" as const,
                    callId: parsed.tool_call_id,
                  },
                ];
              });
            } catch {
              /* malformed */
            }
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
              flushApprovalEvent();
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataLines.push(line.slice(6));
            } else if (line === "") {
              flushApprovalEvent();
            }
          }
        }
        flushApprovalEvent();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          if (approved) {
            setMessages((prev) =>
              prev.map((msg, idx) =>
                idx === targetMsgIdx
                  ? {
                      ...msg,
                      parts: msg.parts.map((p) =>
                        p.type === "tool_call" && p.callId === callId
                          ? { ...p, state: "output-error" as const }
                          : p,
                      ),
                    }
                  : msg,
              ),
            );
          } else {
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
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [userId, isStreaming, getAccessToken],
  );

  const clearMessages = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, sendMessage, approveToolCall, clearMessages };
}
