import AssetRateChart from "@/components/asset-rate-chart";
import useGetAssetPairRates from "@/hooks/api/use-get-asset-pair-rates";

interface Props {
  assetId: number;
  referenceId: number;
  range: string;
}

export default function GlobalAssetRateChart({
  assetId,
  referenceId,
  range,
}: Props) {
  const { data } = useGetAssetPairRates(assetId, referenceId, range);
  return <AssetRateChart rates={data?.data?.rates ?? []} />;
}
