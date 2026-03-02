import { AccountPortfolioApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

const getAccountPortfolioHistory = async (
  userId: string,
  accountId: string,
  range?: string,
  defaultAssetId?: number | null,
) => {
  const data = await AccountPortfolioApiFactory().getAccountNetworthHistory(
    userId,
    accountId,
    range,
    defaultAssetId ?? undefined,
  );
  return data;
};

export default function useGetAccountPortfolioHistory(
  userId: string,
  accountId: string,
  range?: string,
  defaultAssetId?: number | null,
) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.ACCOUNT_PORTFOLIO_HISTORY, accountId, range],
    queryFn: () =>
      getAccountPortfolioHistory(userId, accountId, range, defaultAssetId),
  });
}
