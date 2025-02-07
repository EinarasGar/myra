import {
  IndividualTransactionsApiFactory,
  MandatoryIdentifiableTransactionWithIdentifiableEntries,
} from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useAssetStore } from "./use-asset-store";
import { useAccountStore } from "./use-account-store";
import { PaginatedResponse } from "@/types/pagination";
import { PaginationState } from "@tanstack/react-table";

export default function useGetIndividualTransactions(
  userId: string,
  pagination?: PaginationState
) {
  const addAsset = useAssetStore((state) => state.add);
  const addAccount = useAccountStore((state) => state.add);

  const getIndividualTransactions = async (
    userId: string,
    count?: number,
    start?: number
  ): Promise<
    PaginatedResponse<MandatoryIdentifiableTransactionWithIdentifiableEntries>
  > => {
    const data =
      await IndividualTransactionsApiFactory().getIndividualTransactions(
        userId,
        count,
        start
      );
    // addAsset(
    //   data.data.lookup_tables.assets.map((asset) => {
    //     return { id: asset.asset_id, ...asset };
    //   })
    // );
    // addAccount(
    //   data.data.lookup_tables.accounts.map((account) => {
    //     return { id: account.account_id, ...account };
    //   })
    // );

    return {
      totalCount: data.data.total_results,
      data: data.data.results,
    };
  };

  // Maybe this needs useMemo or smth
  let count: number | undefined;
  let start: number | undefined;
  if (pagination) {
    count = pagination.pageSize;
    start = pagination.pageIndex * pagination.pageSize;
  }

  return useQuery({
    queryKey: [QueryKeys.INDIVIDUAL_TRANSACTIONS, pagination],
    queryFn: () => getIndividualTransactions(userId, count, start),
  });
}
