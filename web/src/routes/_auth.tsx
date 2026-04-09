import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "@/pages/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context, location }) => {
    // Don't redirect while auth is still initializing
    if (context.auth.isLoading) {
      return;
    }
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  // If auth is fully resolved and the user is not authenticated, redirect to login.
  // This handles cases where beforeLoad couldn't redirect (e.g. Clerk SDK was still loading).
  if (!auth.isLoading && !auth.isAuthenticated) {
    navigate({ to: "/login" });
    return null;
  }

  // Render the layout shell immediately — even while the auth provider is still
  // initializing (e.g. Clerk SDK loading). The sidebar already shows skeletons
  // for profile data, and page content suspends inside <AsyncBoundary> until
  // userId resolves.
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <React.Suspense fallback={null}>
          <Outlet />
        </React.Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
