import type * as React from "react";
import type { AuthContext } from "@/hooks/use-auth";

export declare const ProviderAuthContext: React.Context<AuthContext | null>;
export declare function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode;
