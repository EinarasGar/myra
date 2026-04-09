import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/transactions")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
