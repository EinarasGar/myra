import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  PromptInput,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import {
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  FileTextIcon,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  XIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import useAiChat, {
  type ChatMessage,
  type FileUIPart,
} from "@/hooks/use-ai-chat";
import { useUserId } from "@/hooks/use-auth";
import { useCountdown } from "@/hooks/use-countdown";
import { useState, useEffect } from "react";
import {
  AIConversationsApiFactory,
  type IdentifiableConversationResponse,
} from "@/api";
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/hooks/store/use-account-store";
import { useAssetStore } from "@/hooks/store/use-asset-store";
import { useCategoryStore } from "@/hooks/store/use-category-store";

const suggestions = [
  "What did I spend this month?",
  "Show my largest transactions",
  "Give me a spending summary",
  "How much income did I earn?",
];

const AssistantAvatar = () => <Sparkles className="size-4 text-primary" />;

function PromptInputAttachmentsDisplay() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <Attachments
      variant="list"
      className="grid w-full grid-cols-1 gap-2 px-3 pt-2 sm:grid-cols-2"
    >
      {attachments.files.map((file) => {
        const isImage = file.mediaType?.startsWith("image/") ?? false;
        return (
          <Attachment
            key={file.id}
            data={file}
            onRemove={() => attachments.remove(file.id)}
          >
            <AttachmentPreview
              className="size-16"
              fallbackIcon={
                <FileTextIcon className="size-8 text-muted-foreground" />
              }
            />
            <AttachmentInfo
              className={isImage ? "hidden sm:block" : undefined}
              showMediaType
            />
            <AttachmentRemove />
          </Attachment>
        );
      })}
    </Attachments>
  );
}

function formatParamLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\bid\b/gi, "ID")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatParamValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ToolInputTable({ input }: { input: unknown }) {
  if (!input || typeof input !== "object") return null;
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length === 0) return null;
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b last:border-b-0">
              <td className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                {formatParamLabel(key)}
              </td>
              <td className="px-3 py-2 break-all">{formatParamValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ToolCallPart = Extract<
  ChatMessage["parts"][number],
  { type: "tool_call" }
>;

function extractGroupEntries(input: unknown): Record<string, unknown>[] | null {
  if (!input || typeof input !== "object") return null;
  const entries = (input as { entries?: unknown }).entries;
  if (!Array.isArray(entries) || entries.length < 2) return null;
  return entries.filter(
    (e): e is Record<string, unknown> => !!e && typeof e === "object",
  );
}

function extractGroupMeta(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const { entries: _entries, ...rest } = input as Record<string, unknown>;
  return rest;
}

function useIdResolver() {
  const accounts = useAccountStore((s) => s.accounts);
  const assets = useAssetStore((s) => s.assets);
  const categories = useCategoryStore((s) => s.categorys);

  return (record: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key === "account_id" && typeof value === "string") {
        const account = accounts.find((a) => a.id === value);
        out["Account"] = account?.name ?? value;
      } else if (
        key === "asset_id" &&
        (typeof value === "number" || typeof value === "string")
      ) {
        const id = typeof value === "string" ? Number(value) : value;
        const asset = assets.find((a) => a.id === id);
        out["Asset"] = asset
          ? `${asset.ticker} — ${asset.name}`
          : String(value);
      } else if (
        key === "category_id" &&
        (typeof value === "number" || typeof value === "string")
      ) {
        const id = typeof value === "string" ? Number(value) : value;
        const category = categories.find((c) => c.id === id);
        out["Category"] = category?.name ?? String(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  };
}

function GroupEntriesApprovalCard({
  part,
  entries,
  onApprove,
}: {
  part: ToolCallPart;
  entries: Record<string, unknown>[];
  onApprove: (callId: string, approved: boolean) => Promise<void>;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const resolve = useIdResolver();

  const safeIdx = Math.min(currentIdx, Math.max(0, entries.length - 1));
  const current = entries[safeIdx];
  const meta = resolve(extractGroupMeta(part.input));
  const resolvedCurrent = current ? resolve(current) : null;

  async function handle(approved: boolean) {
    if (!part.callId) return;
    setSubmitting(true);
    try {
      await onApprove(part.callId, approved);
    } finally {
      setSubmitting(false);
    }
  }

  if (!current) return null;

  return (
    <div className="space-y-3 rounded-md border p-3">
      {Object.keys(meta).length > 0 && <ToolInputTable input={meta} />}

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Entry {safeIdx + 1} of {entries.length}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={safeIdx === 0 || submitting}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="size-4" />
            <span className="sr-only">Previous entry</span>
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
            {safeIdx + 1} / {entries.length}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={safeIdx === entries.length - 1 || submitting}
            onClick={() =>
              setCurrentIdx((i) => Math.min(entries.length - 1, i + 1))
            }
          >
            <ChevronRight className="size-4" />
            <span className="sr-only">Next entry</span>
          </Button>
        </div>
      </div>

      <ToolInputTable input={resolvedCurrent} />

      <div className="flex items-center justify-between rounded-md border p-3">
        <span className="text-sm text-muted-foreground">
          Approving creates all {entries.length} entries at once.
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={submitting}
            onClick={() => handle(false)}
          >
            Reject
          </Button>
          <Button size="sm" disabled={submitting} onClick={() => handle(true)}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}

function BulkApprovalCard({
  parts,
  onApprove,
}: {
  parts: ToolCallPart[];
  onApprove: (callId: string, approved: boolean) => Promise<void>;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const safeIdx = Math.min(currentIdx, Math.max(0, parts.length - 1));
  const current = parts[safeIdx];

  async function handleAll(approved: boolean) {
    setSubmitting(true);
    try {
      for (const part of parts) {
        if (part.callId) {
          await onApprove(part.callId, approved);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!current) return null;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Review {parts.length} actions</div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={safeIdx === 0 || submitting}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="size-4" />
            <span className="sr-only">Previous</span>
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
            {safeIdx + 1} / {parts.length}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={safeIdx === parts.length - 1 || submitting}
            onClick={() =>
              setCurrentIdx((i) => Math.min(parts.length - 1, i + 1))
            }
          >
            <ChevronRight className="size-4" />
            <span className="sr-only">Next</span>
          </Button>
        </div>
      </div>

      <div className="text-xs font-medium text-muted-foreground">
        {current.name}
      </div>
      <ToolInputTable input={current.input} />

      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={submitting}
          onClick={() => handleAll(false)}
        >
          Reject all
        </Button>
        <Button size="sm" disabled={submitting} onClick={() => handleAll(true)}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Accept all
        </Button>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

function ChatErrorCard({
  message,
  resetAt,
  disabled,
  onRetry,
}: {
  message: string;
  resetAt?: string;
  disabled: boolean;
  onRetry: () => void;
}) {
  const resetMs = useCountdown(resetAt);
  const gated = resetMs > 0;

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
      <p className="text-destructive">{message}</p>
      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        disabled={disabled || gated}
        onClick={onRetry}
      >
        <RefreshCw className="mr-1 h-3 w-3" />
        {gated ? `Retry in ${formatDuration(resetMs)}` : "Retry"}
      </Button>
    </div>
  );
}

function RateLimitBanner({
  until,
  onExpire,
}: {
  until: string;
  onExpire: () => void;
}) {
  const remaining = useCountdown(until);

  useEffect(() => {
    if (remaining <= 0) onExpire();
  }, [remaining, onExpire]);

  if (remaining <= 0) return null;

  return (
    <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      Rate limited — you can send again in {formatDuration(remaining)}
    </div>
  );
}

function MessageParts({
  msg,
  isStreaming,
  isLast,
  onApprove,
  onRetry,
}: {
  msg: ChatMessage;
  isStreaming: boolean;
  isLast: boolean;
  onApprove: (callId: string, approved: boolean) => Promise<void>;
  onRetry: () => void;
}) {
  const isLastAssistant = isStreaming && msg.role === "assistant" && isLast;
  const hasParts = msg.parts.length > 0;
  const isThinking = isLastAssistant && !hasParts;

  if (isThinking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-1">
        <Loader2 className="size-4 animate-spin" />
        Thinking...
      </div>
    );
  }

  const pendingApprovals = msg.parts.filter(
    (p): p is ToolCallPart =>
      p.type === "tool_call" && p.state === "approval-requested" && !!p.callId,
  );
  const useBulkApproval = pendingApprovals.length > 1;

  return (
    <>
      {msg.parts.map((part, j) => {
        switch (part.type) {
          case "file":
            return null;
          case "text":
            return (
              <MessageResponse
                key={j}
                isAnimating={isLastAssistant && j === msg.parts.length - 1}
              >
                {part.content}
              </MessageResponse>
            );
          case "reasoning":
            return (
              <Reasoning
                key={j}
                isStreaming={isLastAssistant && j === msg.parts.length - 1}
              >
                <ReasoningTrigger />
                <ReasoningContent>{part.content}</ReasoningContent>
              </Reasoning>
            );
          case "error":
            return (
              <ChatErrorCard
                key={j}
                message={part.message}
                resetAt={part.resetAt}
                disabled={isStreaming}
                onRetry={onRetry}
              />
            );
          case "tool_call": {
            // When there are 2+ pending approvals, hide their inline cards
            // and let the BulkApprovalCard render them together below.
            if (useBulkApproval && part.state === "approval-requested") {
              return null;
            }
            const isApprovalFlow =
              part.state === "approval-requested" ||
              part.state === "approval-responded" ||
              part.state === "output-denied";
            const groupEntries =
              part.state === "approval-requested" &&
              part.name === "create_transaction_group"
                ? extractGroupEntries(part.input)
                : null;
            return (
              <Tool key={j} defaultOpen={part.state === "approval-requested"}>
                <ToolHeader type={`tool-${part.name}`} state={part.state} />
                <ToolContent>
                  {groupEntries ? (
                    <GroupEntriesApprovalCard
                      part={part}
                      entries={groupEntries}
                      onApprove={onApprove}
                    />
                  ) : (
                    <>
                      {isApprovalFlow ? (
                        <ToolInputTable input={part.input} />
                      ) : (
                        <ToolInput input={part.input} />
                      )}
                      {part.state === "approval-requested" && part.callId && (
                        <div className="flex items-center justify-between rounded-md border p-3">
                          <span className="text-sm text-muted-foreground">
                            This action requires your approval.
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onApprove(part.callId!, false)}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onApprove(part.callId!, true)}
                            >
                              Accept
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {part.state === "approval-responded" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckIcon className="size-4 text-green-600" />
                      <span>Accepted</span>
                    </div>
                  )}
                  {part.state === "output-denied" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <XIcon className="size-4 text-destructive" />
                      <span>Rejected</span>
                    </div>
                  )}
                  {part.state === "output-available" && part.output && (
                    <ToolOutput output={part.output} errorText={undefined} />
                  )}
                  {part.state === "output-error" && (
                    <ToolOutput
                      output={undefined}
                      errorText={part.errorText ?? "Tool execution failed"}
                    />
                  )}
                </ToolContent>
              </Tool>
            );
          }
          default:
            return null;
        }
      })}
      {useBulkApproval && (
        <BulkApprovalCard parts={pendingApprovals} onApprove={onApprove} />
      )}
    </>
  );
}

function formatConversationDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function useConversations(userId: string, activeConversationId: string | null) {
  const [conversations, setConversations] = useState<
    IdentifiableConversationResponse[]
  >([]);

  useEffect(() => {
    AIConversationsApiFactory()
      .listConversations(userId)
      .then((res) => setConversations(res.data.filter((c) => c.title !== null)))
      .catch(() => {});
  }, [userId, activeConversationId]);

  return conversations;
}

function ConversationListBody({
  conversations,
  activeConversationId,
  onSelect,
}: {
  conversations: IdentifiableConversationResponse[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-muted-foreground">
        No conversations yet
      </p>
    );
  }
  return (
    <>
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            "w-full px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors",
            activeConversationId === c.id && "bg-accent font-medium",
          )}
        >
          <div className="truncate">{c.title ?? "New conversation"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatConversationDate(c.updated_at)}
          </div>
        </button>
      ))}
    </>
  );
}

function ConversationSidebar({
  userId,
  activeConversationId,
  onSelect,
  onNew,
}: {
  userId: string;
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const conversations = useConversations(userId, activeConversationId);

  return (
    <div className="hidden h-full w-56 shrink-0 flex-col border-r lg:flex">
      <div className="flex items-center justify-between p-3 border-b">
        <span className="text-sm font-semibold">Conversations</span>
        <Button size="icon" variant="ghost" className="size-7" onClick={onNew}>
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ConversationListBody
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}

function ConversationDrawer({
  userId,
  activeConversationId,
  onSelect,
  onNew,
}: {
  userId: string;
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const conversations = useConversations(userId, activeConversationId);

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
  }

  function handleNew() {
    onNew();
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex size-8 items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground lg:hidden">
        <History className="size-4" />
        <span className="sr-only">Conversations</span>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b p-3 space-y-0">
          <SheetTitle className="text-sm font-semibold">
            Conversations
          </SheetTitle>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={handleNew}
          >
            <Plus className="size-4" />
            <span className="sr-only">New conversation</span>
          </Button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <ConversationListBody
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={handleSelect}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AiChatPage() {
  const userId = useUserId();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const {
    messages,
    isStreaming,
    conversationId,
    rateLimitedUntil,
    sendMessage,
    approveToolCall,
    retry,
    clearMessages,
    clearRateLimitedUntil,
  } = useAiChat(userId, selectedConversationId);

  const hasMessages = messages.length > 0;
  // RateLimitBanner clears rateLimitedUntil when the countdown expires.
  const isRateLimited = rateLimitedUntil !== null;

  function handleSend(text: string, files?: FileUIPart[]) {
    if (rateLimitedUntil) return;
    sendMessage(text, files);
  }

  function handleSelectConversation(id: string) {
    clearMessages();
    setSelectedConversationId(id);
  }

  function handleNewConversation() {
    clearMessages();
    setSelectedConversationId(null);
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex w-full items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <ConversationDrawer
            userId={userId}
            activeConversationId={conversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-2">
                  <Sparkles className="size-4" />
                  AI Assistant
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <ConversationSidebar
          userId={userId}
          activeConversationId={conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
        />

        <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-4 pb-4 min-w-0">
          <Conversation className="min-h-0 flex-1">
            <ConversationContent>
              {!hasMessages ? (
                <ConversationEmptyState
                  title="How can I help?"
                  description="Ask questions about your transactions, spending, income, and more."
                  icon={
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="size-6 text-primary" />
                    </div>
                  }
                />
              ) : (
                messages.map((msg, i) => {
                  const fileParts = msg.parts.filter(
                    (p): p is Extract<typeof p, { type: "file" }> =>
                      p.type === "file",
                  );
                  return (
                    <Message
                      key={i}
                      from={msg.role}
                      avatar={
                        msg.role === "assistant" ? (
                          <AssistantAvatar />
                        ) : undefined
                      }
                    >
                      {fileParts.length > 0 && (
                        <Attachments variant="grid">
                          {fileParts.map((part, j) => (
                            <Attachment
                              key={`file-${j}`}
                              data={{ ...part.file, id: `file-${j}` }}
                            >
                              <AttachmentPreview />
                            </Attachment>
                          ))}
                        </Attachments>
                      )}
                      <MessageContent>
                        <MessageParts
                          msg={msg}
                          isStreaming={isStreaming}
                          isLast={i === messages.length - 1}
                          onApprove={approveToolCall}
                          onRetry={retry}
                        />
                      </MessageContent>
                    </Message>
                  );
                })
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {!hasMessages && (
            <Suggestions className="mb-4 justify-center">
              {suggestions.map((s) => (
                <Suggestion key={s} suggestion={s} onClick={handleSend} />
              ))}
            </Suggestions>
          )}

          <div className="shrink-0 pt-2">
            {rateLimitedUntil && (
              <RateLimitBanner
                until={rateLimitedUntil}
                onExpire={clearRateLimitedUntil}
              />
            )}
            <PromptInputProvider>
              <PromptInput
                onSubmit={({ text, files }) => {
                  handleSend(text, files);
                }}
                accept="image/*,application/pdf"
                multiple
                className="w-full"
              >
                <PromptInputAttachmentsDisplay />
                <PromptInputTextarea placeholder="Ask about your finances..." />
                <PromptInputFooter>
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                  <PromptInputSubmit
                    status={isStreaming ? "streaming" : "ready"}
                    disabled={isRateLimited}
                  />
                </PromptInputFooter>
              </PromptInput>
            </PromptInputProvider>
          </div>
        </div>
      </div>
    </>
  );
}
