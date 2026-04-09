import UserAssetDetailPage from "@/pages/user-assets/detail/page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/user-assets/$assetId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { assetId } = Route.useParams();
  return <UserAssetDetailPage assetId={Number(assetId)} />;
}
