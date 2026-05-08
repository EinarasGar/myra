import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AIConversationsApiFactory, FilesApiFactory } from "@/api";
import { getBaseUrl } from "@/lib/api-utils";
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
  conversationId: string | null;
  sendMessage: (message: string, files?: FileUIPart[]) => void;
  approveToolCall: (callId: string, approved: boolean) => void;
  clearMessages: () => void;
}

function serverPartsToMessageParts(
  content: unknown,
  completedCallIds: Set<string>,
): MessagePart[] {
  if (!content || typeof content !== "object") return [];

  const c = content as Record<string, unknown>;

  // Stored format: {type: "user"|"assistant", content: "text"}
  if (
    (c.type === "user" || c.type === "assistant") &&
    typeof c.content === "string"
  ) {
    return [{ type: "text", content: c.content }];
  }

  // Stored format: {type: "assistant_tool_call", tool_call_id, name, args, ...}
  if (c.type === "assistant_tool_call") {
    let parsedInput: unknown = {};
    try {
      parsedInput =
        typeof c.args === "string" ? JSON.parse(c.args as string) : c.args;
    } catch {
      parsedInput = {};
    }
    const callId = c.tool_call_id as string | undefined;
    const hasResult = callId ? completedCallIds.has(callId) : true;
    return [
      {
        type: "tool_call",
        name: String(c.name ?? ""),
        input: parsedInput,
        state: hasResult ? "output-available" : ("approval-requested" as const),
        callId,
        signature: c.signature as string | undefined,
        output: undefined,
      },
    ];
  }

  // Stored format: {type: "tool_result", tool_call_id, content: "..."}
  if (c.type === "tool_result") {
    return [];
  }

  return [];
}

export default function useAiChat(
  userId: string,
  initialConversationId?: string | null,
): UseAiChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const abortRef = useRef<AbortController | null>(null);
  const { getAccessToken } = useAuth();
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!initialConversationId) return;
    setConversationId(initialConversationId);

    let cancelled = false;
    AIConversationsApiFactory()
      .getMessages(userId, initialConversationId)
      .then(async (res) => {
        if (cancelled) return;

        // Collect all file_ids that need URL resolution
        const fileIdsToResolve: string[] = [];
        for (const m of res.data) {
          if (m.file_ids && m.file_ids.length > 0) {
            fileIdsToResolve.push(...m.file_ids);
          }
        }

        // Fetch presigned URLs for all files in parallel
        const fileUrls: Record<string, string> = {};
        if (fileIdsToResolve.length > 0) {
          const results = await Promise.allSettled(
            fileIdsToResolve.map(async (fileId) => {
              const urlRes = await FilesApiFactory().getFileUrl(userId, fileId);
              return { fileId, url: urlRes.data.url };
            }),
          );
          for (const r of results) {
            if (r.status === "fulfilled") {
              fileUrls[r.value.fileId] = r.value.url;
            }
          }
        }

        const completedCallIds = new Set<string>();
        for (const m of res.data) {
          if (m.role === "tool_result") {
            const tc = m.content as Record<string, unknown> | null;
            if (tc?.tool_call_id)
              completedCallIds.add(tc.tool_call_id as string);
          }
        }

        const merged: ChatMessage[] = [];
        for (const m of res.data) {
          if (m.role === "tool_result" || m.role === "tool_approval") continue;
          const role: "user" | "assistant" =
            m.role === "user" ? "user" : "assistant";

          const parts = serverPartsToMessageParts(m.content, completedCallIds);

          // Add file parts for messages with file_ids
          if (m.file_ids && m.file_ids.length > 0) {
            for (const fileId of m.file_ids) {
              const url = fileUrls[fileId];
              if (url) {
                parts.unshift({
                  type: "file",
                  file: {
                    type: "file" as const,
                    mediaType: "image/*",
                    url,
                  },
                });
              }
            }
          }

          if (parts.length === 0) continue;

          const prev = merged[merged.length - 1];
          if (prev && prev.role === role && role === "assistant") {
            prev.parts.push(...parts);
          } else {
            merged.push({ role, parts });
          }
        }
        setMessages(merged);
      })
      .catch(() => {
        // Failed to load — leave empty
      });

    return () => {
      cancelled = true;
    };
  }, [userId, initialConversationId]);

  const streamSse = useCallback(
    async (
      url: string,
      body: Record<string, unknown>,
      signal: AbortSignal,
      updateMsg: (updater: (parts: MessagePart[]) => MessagePart[]) => void,
    ) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const token = await getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let dataLines: string[] = [];

      const flushEvent = () => {
        if (dataLines.length === 0) return;
        const data = dataLines.join("\n");
        dataLines = [];

        if (currentEvent === "text") {
          updateMsg((parts) => {
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
            updateMsg((parts) => [
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
            updateMsg((parts) =>
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
          updateMsg((parts) => {
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
          updateMsg((parts) => {
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
            updateMsg((parts) => {
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
    },
    [getAccessToken],
  );

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

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Upload files to S3 and collect persistent file IDs
        const fileIds: string[] = [];
        for (const file of files ?? []) {
          try {
            const dataUrl = file.url;
            const mimeType = file.mediaType ?? "application/octet-stream";
            const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, "");
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const fileName =
              file.filename ?? `image.${mimeType.split("/")[1] ?? "bin"}`;

            const createRes = await FilesApiFactory().createFile(userId, {
              mime_type: mimeType,
              original_name: fileName,
              size_bytes: bytes.length,
            });
            const fileRecord = createRes.data;
            const { upload_url, upload_headers, upload_method } =
              fileRecord.upload_metadata;

            const uploadRes = await fetch(upload_url, {
              method: upload_method,
              headers: upload_headers,
              body: bytes,
            });

            if (uploadRes.ok) {
              await FilesApiFactory().confirmFile(userId, fileRecord.id);
              fileIds.push(fileRecord.id);
            }
          } catch {
            // Skip files that fail to upload
          }
        }

        let convId = conversationId;
        if (!convId) {
          const title =
            message.length > 50 ? message.slice(0, 50) + "..." : message;
          const res = await AIConversationsApiFactory().createConversation(
            userId,
            { title },
          );
          convId = res.data.id;
          setConversationId(convId);
        }

        const base = getBaseUrl();
        const url = new URL(
          `/api/users/${userId}/ai/conversations/${convId}/messages`,
          base,
        ).toString();

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

        await streamSse(
          url,
          {
            message,
            file_ids: fileIds,
          },
          controller.signal,
          updateLastAssistant,
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
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
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [conversationId, userId, isStreaming, streamSse],
  );

  const approveToolCall = useCallback(
    async (callId: string, approved: boolean) => {
      if (isStreaming) return;

      const currentMessages = messagesRef.current;
      const assistantMsgIdx = currentMessages.findIndex(
        (m) =>
          m.role === "assistant" &&
          m.parts.some((p) => p.type === "tool_call" && p.callId === callId),
      );
      if (assistantMsgIdx < 0) return;

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

      const targetMsgIdx = approved ? assistantMsgIdx : -1;

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

      try {
        const convId = conversationId;
        if (!convId) {
          setIsStreaming(false);
          return;
        }

        const base = getBaseUrl();
        const url = new URL(
          `/api/users/${userId}/ai/conversations/${convId}/messages`,
          base,
        ).toString();

        await streamSse(
          url,
          {
            tool_approval: {
              tool_call_id: callId,
              approved,
            },
          },
          controller.signal,
          updateTargetMessage,
        );
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
    [userId, conversationId, isStreaming, streamSse],
  );

  const clearMessages = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setMessages([]);
    setConversationId(null);
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    conversationId,
    sendMessage,
    approveToolCall,
    clearMessages,
  };
}
