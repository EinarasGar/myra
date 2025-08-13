import type React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorBoundaryFallbackProps {
  className?: string;
  iconClassName?: string;
  messageClassName?: string;
}

const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  className,
  iconClassName,
  messageClassName,
}) => {
  return (
    <div
      className={cn(
        "w-full h-[200px] flex flex-col items-center justify-center rounded-lg p-4",
        className,
      )}
    >
      <AlertTriangle
        className={cn(
          "w-12 h-12 mb-4 text-zinc-500 dark:text-zinc-400",
          iconClassName,
        )}
      />
      <h2
        className={cn(
          "text-zinc-500 dark:text-zinc-400 text-xl font-semibold mb-2",
          messageClassName,
        )}
      >
        Oops! Something went wrong.
      </h2>
      <p
        className={cn(
          "text-zinc-500 text-sm dark:text-zinc-400 text-center",
          messageClassName,
        )}
      >
        We're sorry, but an error occurred. Please try again later.
      </p>
    </div>
  );
};

export default ErrorBoundaryFallback;
