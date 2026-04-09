import LoginPage from "@/pages/login/page";
import ClerkLoginPage from "@/pages/login/clerk-login-page";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (auth.isAuthenticated) {
    navigate({ to: "/" });
    return null;
  }

  switch (__AUTH_PROVIDER__) {
    case "clerk":
      return <ClerkLoginPage />;
    case "database":
      return <LoginPage />;
    case "noauth":
      return null;
  }
}
