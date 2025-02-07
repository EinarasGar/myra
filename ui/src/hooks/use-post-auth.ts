import { useMutation } from "@tanstack/react-query";
import { AuthenticationApiFactory, LoginDetailsViewModel } from "@/api";

const usePostAuth = () => {
  return useMutation({
    mutationFn: (details: LoginDetailsViewModel) => {
      return AuthenticationApiFactory().postLoginDetails(details);
    },
    onSuccess: () => {},
    onError: () => {},
  });
};

export default usePostAuth;
