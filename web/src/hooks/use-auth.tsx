/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/constants/query-keys";
import {
  AuthProvider as AuthProviderImpl,
  ProviderAuthContext,
} from "@/hooks/auth/provider";

export interface UserProfile {
  displayName: string;
  imageUrl: string | null;
  role: string | null;
}

export interface AuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  userId: string | null;
  userProfile: UserProfile;
}

export const AuthProvider = AuthProviderImpl;

export function useAuth(): AuthContext {
  const context = React.useContext(ProviderAuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Returns the authenticated user's internal UUID.
 * Suspends until the auth provider's /auth/me call populates the cache.
 * Must be used inside a <Suspense> boundary (the _auth layout provides one).
 *
 * This hook only observes the query cache — it never fires its own API call.
 * This is intentional: the auth provider controls when /auth/me is called
 * (e.g. Clerk must set the bearer token first).
 */
export function useUserId(): string {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  if (userId) return userId;

  const cached = queryClient.getQueryData<{ user_id: string }>([
    QueryKeys.AUTH_ME,
  ]);
  if (cached?.user_id) return cached.user_id;

  throw new Promise<void>((resolve) => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      const data = queryClient.getQueryData<{ user_id: string }>([
        QueryKeys.AUTH_ME,
      ]);
      if (data?.user_id) {
        unsubscribe();
        resolve();
      }
    });
  });
}
