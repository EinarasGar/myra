import AiChatPage from "@/pages/ai-chat/ai-chat-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/ai-chat")({
  component: AiChatPage,
});
