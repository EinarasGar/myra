import GlobalAssetsPage from "@/pages/global-assets/page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/global-assets/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GlobalAssetsPage />;
}
