import { PortfolioApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAssetStore } from "../store/use-asset-store";
import { useAccountStore } from "../store/use-account-store";

export default function useGetPortfolioAssetOverview(
  userId: string,
  assetId: number,
  defaultAssetId?: number | null,
) {
  const addAsset = useAssetStore((state) => state.add);
  const addAccount = useAccountStore((state) => state.add);

  const getPortfolioAssetOverview = async (
    userId: string,
    assetId: number,
    defaultAssetId?: number | null,
  ) => {
    const data = await PortfolioApiFactory().getPortfolioAssetOverview(
      userId,
      assetId,
      defaultAssetId ?? undefined,
    );
    addAsset(
      data.data.lookup_tables.assets.map((asset) => {
        return {
          id: asset.asset_id,
          asset_type_id: asset.asset_type,
          ...asset,
        };
      }),
    );
    addAccount(
      data.data.lookup_tables.accounts.map((account) => {
        return {
          id: account.account_id,
          account_type_id: account.account_type,
          liquidity_type_id: 0,
          ...account,
        };
      }),
    );
    return data.data.portfolios;
  };

  return useSuspenseQuery({
    queryKey: [QueryKeys.PORTFOLIO_ASSET_OVERVIEW, assetId, defaultAssetId],
    queryFn: () => getPortfolioAssetOverview(userId, assetId, defaultAssetId),
  });
}
