import { AuthContext } from "@/hooks/use-auth";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

interface MyRouterContext {
  // The ReturnType of your useAuth hook or the value of your AuthContext
  auth: AuthContext;
}

function RootComponent() {
  useDocumentTitle();
  return <Outlet />;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
});
