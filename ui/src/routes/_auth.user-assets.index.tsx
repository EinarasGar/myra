import UserAssetsPage from "@/pages/user-assets/page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/user-assets/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <UserAssetsPage />;
}
