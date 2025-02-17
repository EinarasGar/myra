import { PortfolioApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAssetStore } from "./use-asset-store";
import { useAccountStore } from "./use-account-store";

export default function useGetPortfolioHoldings(
  userId: string,
  defaultAssetId?: number | null
) {
  const addAsset = useAssetStore((state) => state.add);
  const addAccount = useAccountStore((state) => state.add);

  const getPortfolioHoldings = async (
    userId: string,
    defaultAssetId?: number | null
  ) => {
    const data = await PortfolioApiFactory().getHoldings(
      userId,
      defaultAssetId
    );
    addAsset(
      data.data.lookup_tables.assets.map((asset) => {
        return {
          id: asset.asset_id,
          asset_type_id: asset.asset_type,
          ...asset,
        };
      })
    );
    addAccount(
      data.data.lookup_tables.accounts.map((account) => {
        return {
          id: account.account_id,
          type_id: account.account_type,
          ...account,
        };
      })
    );
    return data.data.holdings;
  };

  return useSuspenseQuery({
    queryKey: [QueryKeys.PORTFOLIO_HOLDINGS],
    queryFn: () => getPortfolioHoldings(userId, defaultAssetId),
  });
}
