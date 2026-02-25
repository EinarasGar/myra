import { PortfolioApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

const getPortfolioHistory = async (
  userId: string,
  range?: string,
  defaultAssetId?: number | null,
) => {
  const data = await PortfolioApiFactory().getNetworthHistory(
    userId,
    range,
    defaultAssetId ?? undefined,
  );
  return data;
};

export default function useGetProtfolioHistory(
  userId: string,
  range?: string,
  defaultAssetId?: number | null,
) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.PORTFOLIO_HISTORY, range],
    queryFn: () => getPortfolioHistory(userId, range, defaultAssetId),
  });
}
