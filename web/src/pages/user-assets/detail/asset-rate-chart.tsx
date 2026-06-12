import AssetRateChart from "@/components/asset-rate-chart";
import useGetUserAssetPairRates from "@/hooks/api/use-get-user-asset-pair-rates";
import { useUserId } from "@/hooks/use-auth";

interface Props {
  assetId: number;
  referenceId: number;
  range: string;
}

export default function UserAssetRateChart({
  assetId,
  referenceId,
  range,
}: Props) {
  const userId = useUserId();
  const { data } = useGetUserAssetPairRates(
    userId,
    assetId,
    referenceId,
    range,
  );
  return <AssetRateChart rates={data?.data?.rates ?? []} />;
}
