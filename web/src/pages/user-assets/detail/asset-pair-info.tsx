import AssetPairInfoCard from "@/components/asset-pair-info-card";
import useGetUserAssetPair from "@/hooks/api/use-get-user-asset-pair";
import { useUserId } from "@/hooks/use-auth";

interface Props {
  assetId: number;
  referenceId: number;
}

export default function AssetPairInfo({ assetId, referenceId }: Props) {
  const userId = useUserId();
  const { data } = useGetUserAssetPair(userId, assetId, referenceId);
  const pair = data?.data;

  return (
    <AssetPairInfoCard
      mainTicker={pair?.main_asset?.ticker ?? "?"}
      refTicker={pair?.reference_asset?.ticker ?? "?"}
      latestRate={pair?.metadata?.latest_rate}
      lastUpdated={pair?.metadata?.last_updated}
    >
      <div>
        <p className="text-sm text-muted-foreground">Exchange</p>
        <p className="font-medium">
          {pair?.user_metadata?.exchange ?? "Not set"}
        </p>
      </div>
    </AssetPairInfoCard>
  );
}
