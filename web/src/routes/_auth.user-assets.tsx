import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/user-assets")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
