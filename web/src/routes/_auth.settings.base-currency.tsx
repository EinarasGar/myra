import BaseCurrencyPage from "@/pages/settings/base-currency/base-currency-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings/base-currency")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BaseCurrencyPage />;
}
