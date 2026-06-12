import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/global-assets")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
