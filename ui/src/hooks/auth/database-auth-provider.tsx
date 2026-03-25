/* eslint-disable react-refresh/only-export-components */
import axios from "axios";
import * as React from "react";
import type { AuthContext, UserProfile } from "@/hooks/use-auth";
import useGetAuthMe from "@/hooks/api/use-get-auth-me";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/constants/query-keys";
import { AuthenticationApiFactory } from "@/api/api";

const key = "tanstack.auth.user";

function getStoredUser() {
  return localStorage.getItem(key);
}

function setStoredUser(user: string | null) {
  if (user) {
    localStorage.setItem(key, user);
  } else {
    localStorage.removeItem(key);
  }
}

// Set Authorization header from stored token synchronously on module load,
// so it's available before any API calls (including the initial /auth/me).
const initialToken = getStoredUser();
if (initialToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${initialToken}`;
}

// Send httpOnly cookies with every request
axios.defaults.withCredentials = true;

// 401 interceptor: refresh access token transparently
let refreshPromise: Promise<string> | null = null;

axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes("/api/auth/refresh")
    ) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = AuthenticationApiFactory()
        .postRefreshToken({ withCredentials: true })
        .then((res) => {
          const newToken = res.data.token;
          setStoredUser(newToken);
          axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          return newToken;
        })
        .catch((err) => {
          setStoredUser(null);
          delete axios.defaults.headers.common["Authorization"];
          window.location.href = "/login";
          return Promise.reject(err);
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newToken = await refreshPromise;
    original.headers["Authorization"] = `Bearer ${newToken}`;
    return axios(original);
  },
);

export const ProviderAuthContext = React.createContext<AuthContext | null>(
  null,
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(initialToken);
  const queryClient = useQueryClient();
  const { data: meData } = useGetAuthMe(!!token);

  const userId = meData?.user_id ?? null;
  const userProfile: UserProfile = {
    displayName: meData?.user_metadata?.username ?? "User",
    imageUrl: meData?.user_metadata?.image_url ?? null,
    role: meData?.role ?? null,
  };

  const login = React.useCallback(
    async (tokenValue: string) => {
      setStoredUser(tokenValue);
      setToken(tokenValue);
      axios.defaults.headers.common["Authorization"] = `Bearer ${tokenValue}`;
      // Invalidate to re-fetch /auth/me with the new token
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.AUTH_ME] });
    },
    [queryClient],
  );

  const logout = React.useCallback(async () => {
    // Best-effort server-side logout to revoke refresh tokens
    try {
      await AuthenticationApiFactory().postLogout();
    } catch {
      // Ignore errors — still clear local state
    }
    setStoredUser(null);
    setToken(null);
    delete axios.defaults.headers.common["Authorization"];
    queryClient.removeQueries({ queryKey: [QueryKeys.AUTH_ME] });
  }, [queryClient]);

  // isAuthenticated is true immediately when a token exists in localStorage.
  // This allows the layout to render instantly without waiting for /auth/me.
  // userId remains null until /auth/me resolves — consumers handle this via useUserId().
  const isAuthenticated = !!token;

  return (
    <ProviderAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: false,
        userId,
        login,
        logout,
        getAccessToken: async () => getStoredUser(),
        userProfile,
      }}
    >
      {children}
    </ProviderAuthContext.Provider>
  );
}
