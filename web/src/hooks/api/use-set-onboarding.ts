import { UsersApiFactory, SetOnboardingVersionRequest } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSetOnboarding(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetOnboardingVersionRequest) =>
      UsersApiFactory().postOnboarding(userId, data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.AUTH_ME],
      });
    },
  });
}
