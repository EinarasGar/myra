import { TransactionsApiFactory, type CombinedTransactionsPage } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAssetStore } from "../store/use-asset-store";
import { useAccountStore } from "../store/use-account-store";
import { useCategoryStore } from "../store/use-category-store";

const PAGE_SIZE = 25;

export default function useGetCombinedTransactions(
  userId: string,
  query?: string,
) {
  const addAsset = useAssetStore((state) => state.add);
  const addAccount = useAccountStore((state) => state.add);
  const addCategory = useCategoryStore((state) => state.add);

  return useInfiniteQuery<CombinedTransactionsPage>({
    queryKey: [QueryKeys.COMBINED_TRANSACTIONS, userId, query],
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      const data = await TransactionsApiFactory().getTransactions(
        userId,
        PAGE_SIZE,
        cursor,
        undefined,
        undefined,
        query || undefined,
      );
      const page = data.data;

      addAsset(
        page.lookup_tables.assets.map((asset) => ({
          id: asset.asset_id,
          asset_type_id: asset.asset_type,
          ...asset,
        })),
      );
      addAccount(
        page.lookup_tables.accounts.map((account) => ({
          id: account.account_id,
          account_type_id: account.account_type,
          liquidity_type_id: 0,
          ...account,
        })),
      );

      if (page.lookup_tables.categories) {
        addCategory(
          page.lookup_tables.categories.map((cat) => ({
            id: cat.id,
            name: cat.category,
            icon: cat.icon,
            isSystem: cat.is_system,
            isGlobal: cat.is_global,
            type: {
              id: cat.category_type,
              name: "",
            },
          })),
        );
      }

      return page;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    throwOnError: true,
  });
}
