/* eslint-disable react-refresh/only-export-components */
import {
  ClerkProvider,
  useAuth as useClerkAuthHook,
  useUser,
} from "@clerk/clerk-react";
import axios from "axios";
import * as React from "react";
import type { AuthContext, UserProfile } from "@/hooks/use-auth";
import useGetAuthMe from "@/hooks/api/use-get-auth-me";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/constants/query-keys";

const CLERK_PUBLISHABLE_KEY = __CLERK_PUBLISHABLE_KEY__;

export const ProviderAuthContext = React.createContext<AuthContext | null>(
  null,
);

function ClerkAuthBridge({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, getToken, signOut } = useClerkAuthHook();
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = React.useState(false);

  // Install an axios interceptor that gets a fresh Clerk token per request.
  // This replaces manual token refresh timers — Clerk SDK handles token
  // lifecycle internally, and getToken() always returns a valid token.
  React.useEffect(() => {
    if (!isSignedIn) {
      setIsReady(false);
      queryClient.removeQueries({ queryKey: [QueryKeys.AUTH_ME] });
      return;
    }

    const interceptor = axios.interceptors.request.use(async (config) => {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    setIsReady(true);

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [isSignedIn, getToken, queryClient]);

  // Only fire /auth/me once the interceptor is installed
  const { data: meData } = useGetAuthMe(!!isSignedIn && isReady);

  const userId = meData?.user_id ?? null;

  // Clerk provides richer profile data (name, photo from OAuth)
  const userProfile: UserProfile = {
    displayName:
      clerkUser?.fullName ??
      clerkUser?.firstName ??
      clerkUser?.primaryEmailAddress?.emailAddress ??
      "User",
    imageUrl: clerkUser?.imageUrl ?? null,
    role: meData?.role ?? null,
  };

  // isAuthenticated is true as soon as Clerk says signed in — don't wait for /auth/me.
  // This lets the layout render immediately. userId resolves asynchronously.
  const isAuthenticated = !!isSignedIn;
  // Only loading during Clerk's initial SDK load — very brief
  const isLoading = !isLoaded;

  const authContext: AuthContext = {
    isAuthenticated,
    isLoading,
    userId,
    userProfile,
    login: async () => {
      /* no-op: Clerk handles login via its own UI */
    },
    logout: async () => {
      await signOut();
      // Interceptor cleanup and query removal happen in the effect
      // when isSignedIn transitions to false
    },
    getAccessToken: async () => getToken(),
  };

  return (
    <ProviderAuthContext.Provider value={authContext}>
      {children}
    </ProviderAuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      "CLERK_PUBLISHABLE_KEY must be set when using Clerk authentication",
    );
  }
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}
