import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

const BRAND = "Sverto";

const routeTitles: Record<string, string> = {
  "/": "Home",
  "/transactions": "Transactions",
  "/transactions/individual": "Transactions",
  "/portfolio": "Portfolio",
  "/portfolio-overview": "Portfolio",
  "/ai-chat": "AI Chat",
  "/component-testing": "Component Testing",
  "/login": "Login",
  "/signup": "Sign Up",
  "/about": "About",
};

const prefixTitles: [string, string][] = [
  ["/settings/", "Settings"],
  ["/user-assets/", "Assets"],
  ["/accounts/", "Accounts"],
];

function getTitleForPath(pathname: string): string {
  const exact = routeTitles[pathname];
  if (exact) return `${exact} | ${BRAND}`;

  for (const [prefix, title] of prefixTitles) {
    if (pathname.startsWith(prefix)) return `${title} | ${BRAND}`;
  }

  // Handle /user-assets and /settings exact (no trailing segment)
  if (pathname === "/user-assets") return `Assets | ${BRAND}`;
  if (pathname.startsWith("/settings")) return `Settings | ${BRAND}`;

  return BRAND;
}

export function useDocumentTitle() {
  const location = useLocation();

  useEffect(() => {
    document.title = getTitleForPath(location.pathname);
  }, [location.pathname]);
}
