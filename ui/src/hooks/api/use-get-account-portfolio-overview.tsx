import { AccountPortfolioApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAssetStore } from "../store/use-asset-store";
import { useAccountStore } from "../store/use-account-store";

export default function useGetAccountPortfolioOverview(
  userId: string,
  accountId: string,
  defaultAssetId?: number | null,
) {
  const addAsset = useAssetStore((state) => state.add);
  const addAccount = useAccountStore((state) => state.add);

  const getAccountPortfolioOverview = async (
    userId: string,
    accountId: string,
    defaultAssetId?: number | null,
  ) => {
    const data = await AccountPortfolioApiFactory().getAccountPortfolioOverview(
      userId,
      accountId,
      { default_asset_id: defaultAssetId ?? 3 } as unknown as number,
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
    queryKey: [QueryKeys.ACCOUNT_PORTFOLIO_OVERVIEW, accountId],
    queryFn: () =>
      getAccountPortfolioOverview(userId, accountId, defaultAssetId),
  });
}
