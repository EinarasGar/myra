import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
