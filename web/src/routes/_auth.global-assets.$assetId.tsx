import GlobalAssetDetailPage from "@/pages/global-assets/detail/page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/global-assets/$assetId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { assetId } = Route.useParams();
  return <GlobalAssetDetailPage assetId={Number(assetId)} />;
}
