/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import type { AuthContext, UserProfile } from "@/hooks/use-auth";
import useGetAuthMe from "@/hooks/api/use-get-auth-me";

export const ProviderAuthContext = React.createContext<AuthContext | null>(
  null,
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: meData } = useGetAuthMe(true);

  const userId = meData?.user_id ?? null;
  const userProfile: UserProfile = {
    displayName: meData?.user_metadata?.username ?? "User",
    imageUrl: meData?.user_metadata?.image_url ?? null,
    role: meData?.role ?? null,
  };

  // Always authenticated in noauth mode, never loading.
  // userId resolves once /auth/me returns — consumers handle null via useUserId().
  const authContext: AuthContext = {
    isAuthenticated: true,
    isLoading: false,
    userId,
    userProfile,
    login: async () => {},
    logout: async () => {},
  };

  return (
    <ProviderAuthContext.Provider value={authContext}>
      {children}
    </ProviderAuthContext.Provider>
  );
}
