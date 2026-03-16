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
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Loader2, Sparkles } from "lucide-react";
import useAiChat, { type ChatMessage } from "@/hooks/use-ai-chat";
import { useUserId } from "@/hooks/use-auth";

const suggestions = [
  "What did I spend this month?",
  "Show my largest transactions",
  "Give me a spending summary",
  "How much income did I earn?",
];

const AssistantAvatar = () => <Sparkles className="size-4 text-primary" />;

function MessageParts({
  msg,
  isStreaming,
  isLast,
}: {
  msg: ChatMessage;
  isStreaming: boolean;
  isLast: boolean;
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
          case "text":
            return (
              <MessageResponse
                key={j}
                isAnimating={
                  isLastAssistant && j === msg.parts.length - 1
                }
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
          case "tool_call":
            return (
              <Tool key={j} defaultOpen={false}>
                <ToolHeader
                  type={`tool-${part.name}`}
                  state={
                    part.state === "complete"
                      ? "output-available"
                      : "input-available"
                  }
                />
                <ToolContent>
                  <ToolInput input={part.input} />
                  {part.output && (
                    <ToolOutput
                      output={part.output}
                      errorText={undefined}
                    />
                  )}
                </ToolContent>
              </Tool>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

export default function AiChatPage() {
  const userId = useUserId();
  const { messages, isStreaming, sendMessage } = useAiChat(userId);

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
              messages.map((msg, i) => (
                <Message
                  key={i}
                  from={msg.role}
                  avatar={
                    msg.role === "assistant" ? <AssistantAvatar /> : undefined
                  }
                >
                  <MessageContent>
                    <MessageParts
                      msg={msg}
                      isStreaming={isStreaming}
                      isLast={i === messages.length - 1}
                    />
                  </MessageContent>
                </Message>
              ))
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
              onSubmit={({ text }) => {
                sendMessage(text);
              }}
              className="w-full"
            >
              <PromptInputTextarea placeholder="Ask about your finances..." />
              <PromptInputFooter>
                <div />
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
