import OnboardingPage from "@/pages/onboarding/onboarding-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/onboarding")({
  component: RouteComponent,
});

function RouteComponent() {
  return <OnboardingPage />;
}
