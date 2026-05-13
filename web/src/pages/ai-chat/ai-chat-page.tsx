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
  AttachmentRemove,
} from "@/components/ai-elements/attachments";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import { CheckIcon, Loader2, Sparkles, XIcon } from "lucide-react";
import useAiChat, { type ChatMessage } from "@/hooks/use-ai-chat";
import { useUserId } from "@/hooks/use-auth";

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
    <Attachments variant="inline" className="px-3 pt-2">
      {attachments.files.map((file) => (
        <Attachment
          key={file.id}
          data={file}
          onRemove={() => attachments.remove(file.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
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

function MessageParts({
  msg,
  isStreaming,
  isLast,
  onApprove,
}: {
  msg: ChatMessage;
  isStreaming: boolean;
  isLast: boolean;
  onApprove: (callId: string, approved: boolean) => void;
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
          case "tool_call": {
            const isApprovalFlow =
              part.state === "approval-requested" ||
              part.state === "approval-responded" ||
              part.state === "output-denied";
            return (
              <Tool key={j} defaultOpen={part.state === "approval-requested"}>
                <ToolHeader type={`tool-${part.name}`} state={part.state} />
                <ToolContent>
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
    </>
  );
}

export default function AiChatPage() {
  const userId = useUserId();
  const { messages, isStreaming, sendMessage, approveToolCall } =
    useAiChat(userId);

  const hasMessages = messages.length > 0;

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

      <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-5xl flex-col px-4 pb-4">
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
                      msg.role === "assistant" ? <AssistantAvatar /> : undefined
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
              <Suggestion key={s} suggestion={s} onClick={sendMessage} />
            ))}
          </Suggestions>
        )}

        <div className="shrink-0 pt-2">
          <PromptInputProvider>
            <PromptInput
              onSubmit={({ text, files }) => {
                sendMessage(text, files);
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
                />
              </PromptInputFooter>
            </PromptInput>
          </PromptInputProvider>
        </div>
      </div>
    </>
  );
}
