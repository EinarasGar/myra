import ConnectorsPage from "@/pages/settings/connectors/connectors-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings/connectors/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ConnectorsPage />;
}
