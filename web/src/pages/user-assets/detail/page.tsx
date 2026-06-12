import AssetDetailPageShell from "@/components/asset-detail-page-shell";
import AssetDetailContent from "./asset-detail-content";

interface Props {
  assetId: number;
}

export default function UserAssetDetailPage({ assetId }: Props) {
  return (
    <AssetDetailPageShell listLabel="User Assets" listHref="/user-assets">
      <AssetDetailContent assetId={assetId} />
    </AssetDetailPageShell>
  );
}
