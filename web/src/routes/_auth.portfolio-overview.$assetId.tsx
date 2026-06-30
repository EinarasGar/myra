import PortfolioAssetOverviewPage from "@/pages/portfolio-overview/asset-overview/page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/portfolio-overview/$assetId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { assetId } = Route.useParams();
  return <PortfolioAssetOverviewPage assetId={Number(assetId)} />;
}
