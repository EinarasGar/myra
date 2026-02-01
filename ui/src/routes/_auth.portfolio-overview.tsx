import PortfolioOverviewPage from "@/pages/portfolio-overview/page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/portfolio-overview")({
  component: RouteComponent,
});

function RouteComponent() {
  return <PortfolioOverviewPage />;
}
