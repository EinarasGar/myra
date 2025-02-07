import IndividialTransactionsPage from "@/pages/transactions/individual-transactions-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/transactions/individual")({
  component: RouteComponent,
});

function RouteComponent() {
  return <IndividialTransactionsPage></IndividialTransactionsPage>;
}
