import TransactionsPage from "@/pages/transactions/transactions-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/transactions/")({
  component: TransactionsPage,
});
