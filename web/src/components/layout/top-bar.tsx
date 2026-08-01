import { Link } from "@tanstack/react-router"
import { Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives/focus-ring"
import { Truncate } from "@/components/primitives/truncate"

import { PAGE_PADDING_X } from "./breakpoints"
import { NavDrawer } from "./nav-drawer"
import { ProfileMenu } from "./profile-menu"
import { SearchIconButton, SearchTrigger } from "./search-trigger"
import { SvertoMark } from "./sverto-mark"

export function DesktopTopBar() {
  return (
    <div
      className={cn(
        "flex h-[60px] flex-none items-center gap-3",
        PAGE_PADDING_X
      )}
    >
      <div className="flex-1" />
      <SearchTrigger />
    </div>
  )
}

export function CompactTopBar({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-30 flex h-[52px] flex-none items-center gap-2.5 border-b border-border bg-background px-4">
      <NavDrawer
        trigger={
          <button
            type="button"
            aria-label="Open navigation"
            className={cn(
              "relative flex size-6 flex-none items-center justify-center text-ink-2 after:absolute after:-inset-2.5 after:content-['']",
              focusRing.sm
            )}
          >
            <Menu className="size-[17px]" strokeWidth={1.9} aria-hidden />
          </button>
        }
      />
      <Link to="/" aria-label="Sverto home" className={cn(focusRing.sm)}>
        <SvertoMark className="size-[19px]" />
      </Link>
      <Truncate
        text={title}
        className="min-w-0 flex-1 text-[13.5px] leading-none font-semibold tracking-[-0.01em]"
      />
      <SearchIconButton />
      <ProfileMenu size="compact" />
    </div>
  )
}
