import PortfolioPage from "@/pages/portfolio/page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/portfolio")({
  component: RouteComponent,
});

function RouteComponent() {
  return <PortfolioPage></PortfolioPage>;
}
