import { AuthenticationApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useQuery } from "@tanstack/react-query";

export default function useGetAuthMe(enabled: boolean) {
  return useQuery({
    queryKey: [QueryKeys.AUTH_ME],
    queryFn: async ({ signal }) => {
      const response = await AuthenticationApiFactory().getMe({ signal });
      return response.data;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: true,
  });
}
