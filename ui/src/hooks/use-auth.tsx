/* eslint-disable react-refresh/only-export-components */
import axios from "axios";
import * as React from "react";
import { getUserIdFromToken } from "@/lib/jwt";

export interface AuthContext {
  isAuthenticated: boolean;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  user: string | null;
}

const AuthContext = React.createContext<AuthContext | null>(null);

const key = "tanstack.auth.user";

function getStoredUser() {
  const user = localStorage.getItem(key);
  axios.defaults.headers.common["Authorization"] = `Bearer ${user}`;
  return user;
}

function setStoredUser(user: string | null) {
  console.log(user);
  if (user) {
    localStorage.setItem(key, user);
  } else {
    localStorage.removeItem(key);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<string | null>(getStoredUser());
  const isAuthenticated = !!user;

  const logout = React.useCallback(async () => {
    setStoredUser(null);
    setUser(null);
  }, []);

  const login = React.useCallback(async (username: string) => {
    setStoredUser(username);
    setUser(username);
    axios.defaults.headers.common["Authorization"] = `Bearer ${username}`;
  }, []);

  React.useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthUserId(): string {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  if (!context.user) {
    throw new Error("User is not available");
  }
  const userId = getUserIdFromToken(context.user);
  if (!userId) {
    throw new Error("Failed to extract user ID from token");
  }

  return userId;
}
