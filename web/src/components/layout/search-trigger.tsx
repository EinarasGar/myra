import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives/focus-ring"
import { usePaletteStore } from "@/components/command-palette/palette-store"

import { KEYBOARD_ONLY } from "./breakpoints"

export function SearchTrigger({ className }: { className?: string }) {
  const openPalette = usePaletteStore((state) => state.openPalette)

  return (
    <button
      type="button"
      onClick={() => openPalette()}
      className={cn(
        "relative flex items-center gap-[7px] rounded-sm border border-border px-[11px] py-1.5 text-ink-3 transition-colors duration-instant ease-out-quick hover:border-border-strong hover:text-ink-2",
        "after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-['']",
        focusRing.sm,
        className
      )}
    >
      <Search className="size-[13px] flex-none" strokeWidth={2} aria-hidden />
      <span className="text-[12px] leading-none">Search or ask Myra…</span>
      <span
        className={cn(
          KEYBOARD_ONLY,
          "rounded-chip border border-border-strong px-1 py-0.5 font-mono text-[10px] leading-none font-medium"
        )}
      >
        ⌘K
      </span>
    </button>
  )
}

export function SearchIconButton({ className }: { className?: string }) {
  const openPalette = usePaletteStore((state) => state.openPalette)

  return (
    <button
      type="button"
      aria-label="Search or ask Myra"
      onClick={() => openPalette()}
      className={cn(
        "relative flex size-6 flex-none items-center justify-center rounded-sm text-ink-3 after:absolute after:-inset-2.5 after:content-['']",
        focusRing.sm,
        className
      )}
    >
      <Search className="size-4" strokeWidth={2} aria-hidden />
    </button>
  )
}
