import { PortfolioApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useQuery } from "@tanstack/react-query";
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
        return { id: asset.asset_id, ...asset };
      })
    );
    addAccount(
      data.data.lookup_tables.accounts.map((account) => {
        return { id: account.account_id, ...account };
      })
    );
    return data.data.holdings;
  };

  return useQuery({
    queryKey: [QueryKeys.PORTFOLIO_HOLDINGS],
    queryFn: () => getPortfolioHoldings(userId, defaultAssetId),
  });
}
