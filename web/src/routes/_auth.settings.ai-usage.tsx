import AiUsagePage from "@/pages/settings/ai-usage/ai-usage-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings/ai-usage")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AiUsagePage />;
}
