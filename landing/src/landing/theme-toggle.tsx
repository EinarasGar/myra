import { Lightbulb } from "lucide-react"

import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives/focus-ring"

/**
 * Driven by the inline script in the base layout, so the marketing page keeps
 * shipping no framework JS for a single button.
 */
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      data-theme-toggle
      aria-label="Switch theme"
      aria-pressed="false"
      className={cn(
        "flex size-9 items-center justify-center rounded-button text-ink-3 transition-colors duration-instant ease-out-quick hover:bg-surface-2 hover:text-ink",
        focusRing.sm,
        className
      )}
    >
      <Lightbulb aria-hidden className="size-[17px]" />
    </button>
  )
}
