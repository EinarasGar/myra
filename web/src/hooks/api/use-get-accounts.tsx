import { AccountsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useAccountStore } from "../store/use-account-store";
import { useAssetStore } from "../store/use-asset-store";

export default function useGetAccounts(userId: string) {
  const addAccount = useAccountStore((state) => state.add);
  const addAccountType = useAccountStore((state) => state.addAccountType);
  const addLiquidityType = useAccountStore((state) => state.addLiquidityType);
  const addAsset = useAssetStore((state) => state.add);

  const getAccounts = async (userId: string, signal?: AbortSignal) => {
    const data = await AccountsApiFactory().getAccounts(userId, {
      signal,
    });

    addAccount(
      data.data.accounts.map((account) => ({
        id: account.account_id,
        account_type_id: account.account_type,
        liquidity_type_id: account.liquidity_type,
        name: account.name,
        suggested_currency_id: account.suggested_currency ?? null,
      })),
    );

    addAsset(
      data.data.lookup_tables.assets.map((asset) => ({
        id: asset.asset_id,
        ticker: asset.ticker,
        name: asset.name,
        asset_type_id: asset.asset_type,
      })),
    );

    addAccountType(
      data.data.lookup_tables.account_types.map((accountType) => ({
        id: accountType.id,
        name: accountType.name,
      })),
    );

    addLiquidityType(
      data.data.lookup_tables.account_liquidity_types.map((liquidityType) => ({
        id: liquidityType.id,
        name: liquidityType.name,
      })),
    );

    return data.data;
  };

  return useQuery({
    queryKey: [QueryKeys.ACCOUNTS, userId],
    queryFn: ({ signal }) => {
      return getAccounts(userId, signal);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
