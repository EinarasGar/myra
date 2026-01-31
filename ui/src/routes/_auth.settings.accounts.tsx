import AccountsPage from "@/pages/settings/accounts/accounts-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings/accounts")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AccountsPage />;
}
