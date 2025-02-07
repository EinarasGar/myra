import { PortfolioApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useQuery } from "@tanstack/react-query";

const getPortfolioHistory = async (
  userId: string,
  range?: string,
  defaultAssetId?: number | null
) => {
  const data = await PortfolioApiFactory().getNetworthHistory(
    userId,
    range,
    defaultAssetId
  );
  return data;
};

export default function useGetProtfolioHistory(
  userId: string,
  range?: string,
  defaultAssetId?: number | null
) {
  return useQuery({
    queryKey: [QueryKeys.PORTFOLIO_HISTORY],
    queryFn: () => getPortfolioHistory(userId, range, defaultAssetId),
  });
}
