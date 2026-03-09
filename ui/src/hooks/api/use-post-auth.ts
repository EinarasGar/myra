import { useMutation } from "@tanstack/react-query";
import { AuthenticationApiFactory, LoginDetails } from "@/api";

const usePostAuth = () => {
  return useMutation({
    mutationFn: (details: LoginDetails) => {
      return AuthenticationApiFactory().postLoginDetails(details);
    },
    onSuccess: () => {},
    onError: () => {},
  });
};

export default usePostAuth;
