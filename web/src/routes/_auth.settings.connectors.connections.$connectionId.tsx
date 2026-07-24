import ConnectionDetailPage from "@/pages/settings/connectors/connection-detail-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_auth/settings/connectors/connections/$connectionId",
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <ConnectionDetailPage />;
}
