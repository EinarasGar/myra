import ConnectorDetailPage from "@/pages/settings/connectors/connector-detail-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_auth/settings/connectors/$providerKind",
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <ConnectorDetailPage />;
}
