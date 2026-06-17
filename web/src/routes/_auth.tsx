import * as React from "react";
import {
  useAuth,
  useOnboardingVersion,
} from "@/hooks/use-auth";
import { CURRENT_ONBOARDING_VERSION } from "@/constants/onboarding";
import { AppSidebar } from "@/pages/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
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
  const location = useLocation();
  const onboardingVersion = useOnboardingVersion();

  const shouldRedirectToLogin = !auth.isLoading && !auth.isAuthenticated;
  const shouldRedirectToOnboarding =
    onboardingVersion !== undefined &&
    onboardingVersion < CURRENT_ONBOARDING_VERSION &&
    !location.pathname.startsWith("/onboarding");

  React.useEffect(() => {
    if (shouldRedirectToLogin) {
      navigate({ to: "/login" });
    }
  }, [navigate, shouldRedirectToLogin]);

  React.useEffect(() => {
    if (shouldRedirectToOnboarding) {
      navigate({ to: "/onboarding" });
    }
  }, [navigate, shouldRedirectToOnboarding]);

  if (shouldRedirectToLogin || shouldRedirectToOnboarding) {
    return null;
  }
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
