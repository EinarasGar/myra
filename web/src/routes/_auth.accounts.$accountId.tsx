import AccountDetailPage from "@/pages/account-detail/page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/accounts/$accountId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AccountDetailPage />;
}
