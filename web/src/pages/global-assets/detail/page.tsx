import AssetDetailPageShell from "@/components/asset-detail-page-shell";
import AssetDetailContent from "./asset-detail-content";

interface Props {
  assetId: number;
}

export default function GlobalAssetDetailPage({ assetId }: Props) {
  return (
    <AssetDetailPageShell listLabel="Global Assets" listHref="/global-assets">
      <AssetDetailContent assetId={assetId} />
    </AssetDetailPageShell>
  );
}
