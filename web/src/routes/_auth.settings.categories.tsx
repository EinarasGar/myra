import CategoriesPage from "@/pages/settings/categories/categories-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings/categories")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CategoriesPage />;
}
