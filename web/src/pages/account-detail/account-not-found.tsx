import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function AccountNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertTriangle className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Account not found</h1>
      <p className="text-muted-foreground text-center max-w-md">
        The account you're looking for doesn't exist or you don't have access to
        it.
      </p>
      <Link
        to="/settings/accounts"
        className={buttonVariants({ variant: "outline" })}
      >
        Back to Accounts
      </Link>
    </div>
  );
}
