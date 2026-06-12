import AssetPairInfoCard from "@/components/asset-pair-info-card";
import useGetAssetPair from "@/hooks/api/use-get-asset-pair";

interface Props {
  assetId: number;
  referenceId: number;
}

export default function AssetPairInfo({ assetId, referenceId }: Props) {
  const { data } = useGetAssetPair(assetId, referenceId);
  const pair = data?.data;
  const volume = pair?.metadata?.volume;

  return (
    <AssetPairInfoCard
      mainTicker={pair?.main_asset?.ticker ?? "?"}
      refTicker={pair?.reference_asset?.ticker ?? "?"}
      latestRate={pair?.metadata?.latest_rate}
      lastUpdated={pair?.metadata?.last_updated}
    >
      {volume != null && (
        <div>
          <p className="text-sm text-muted-foreground">Volume</p>
          <p className="font-medium">{volume}</p>
        </div>
      )}
    </AssetPairInfoCard>
  );
}
