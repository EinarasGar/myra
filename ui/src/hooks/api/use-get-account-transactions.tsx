import {
  AccountPortfolioApiFactory,
  RequiredIdentifiableTransaction,
} from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAssetStore } from "../store/use-asset-store";
import { useAccountStore } from "../store/use-account-store";
import { PaginatedResponse } from "@/types/pagination";
import { PaginationState } from "@tanstack/react-table";

export default function useGetAccountTransactions(
  userId: string,
  accountId: string,
  pagination?: PaginationState,
) {
  const addAsset = useAssetStore((state) => state.add);
  const addAccount = useAccountStore((state) => state.add);

  const getAccountTransactions = async (
    userId: string,
    accountId: string,
    count?: number,
    start?: number,
  ): Promise<PaginatedResponse<RequiredIdentifiableTransaction>> => {
    const data =
      await AccountPortfolioApiFactory().getAccountTransactions(
        userId,
        accountId,
        count,
        start,
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

    return {
      totalCount: data.data.total_results,
      data: data.data.results,
    };
  };

  let count: number | undefined;
  let start: number | undefined;
  if (pagination) {
    count = pagination.pageSize;
    start = pagination.pageIndex * pagination.pageSize;
  }

  return useSuspenseQuery({
    queryKey: [QueryKeys.ACCOUNT_TRANSACTIONS, accountId, pagination],
    queryFn: () => getAccountTransactions(userId, accountId, count, start),
  });
}
