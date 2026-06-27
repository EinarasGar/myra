import { AIApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useGetAiUsage(userId: string) {
  return useSuspenseQuery({
    queryKey: [QueryKeys.AI_USAGE, userId],
    queryFn: async () => {
      const response = await AIApiFactory().getUsage(userId);
      return response.data;
    },
    staleTime: 1000 * 30,
  });
}
