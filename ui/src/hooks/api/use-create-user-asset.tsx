import {
  UserAssetsApiFactory,
  type AddAssetRequestViewModel,
} from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function useCreateUserAsset(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddAssetRequestViewModel) =>
      UserAssetsApiFactory().postCustomAsset(userId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_ASSETS] });
    },
  });
}
