import DashbaordPage from "@/pages/dashboard/page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DashbaordPage></DashbaordPage>;
}
