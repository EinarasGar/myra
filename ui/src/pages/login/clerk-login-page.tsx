import { SignIn, useAuth as useClerkAuthHook } from "@clerk/clerk-react";

export default function ClerkLoginPage() {
  const { isSignedIn, isLoaded } = useClerkAuthHook();

  // Clerk session exists but we're waiting for internal user ID resolution
  if (isLoaded && isSignedIn) {
    return (
      <div className="bg-zinc-100 flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10 dark:bg-zinc-800">
        <div className="text-sm text-zinc-500">Signing you in...</div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-100 flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10 dark:bg-zinc-800">
      <SignIn routing="hash" />
    </div>
  );
}
