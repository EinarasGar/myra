import { Card, CardContent } from "@/components/ui/card";
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

  const mainTicker = pair?.main_asset?.ticker ?? "?";
  const refTicker = pair?.reference_asset?.ticker ?? "?";
  const latestRate = pair?.metadata?.latest_rate;
  const lastUpdated = pair?.metadata?.last_updated;
  const exchange = pair?.user_metadata?.exchange;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">Pair</p>
            <p className="font-medium">
              {mainTicker} ↔ {refTicker}
            </p>
          </div>
          {latestRate != null && (
            <div>
              <p className="text-sm text-muted-foreground">Latest Rate</p>
              <p className="font-medium">{latestRate}</p>
            </div>
          )}
          {lastUpdated != null && (
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">
                {new Date(lastUpdated * 1000).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Exchange</p>
            <p className="font-medium">{exchange ?? "Not set"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
