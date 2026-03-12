import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/transactions/individual")({
  beforeLoad: () => {
    throw redirect({ to: "/transactions" });
  },
});
