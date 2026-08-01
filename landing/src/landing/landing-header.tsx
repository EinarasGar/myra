import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { focusRing } from "@/components/primitives/focus-ring"
import { SvertoMark } from "@/components/layout/sverto-mark"

import { appUrl } from "./app-url"
import { isExternalTarget, LANDING_NAV } from "./links"
import { ThemeToggle } from "./theme-toggle"

const NAV_LINK =
  "text-[13px] leading-none font-medium text-ink-2 transition-colors duration-instant ease-out-quick hover:text-ink"

function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[15px] leading-none font-bold tracking-[-0.02em] xl:text-[16px]",
        className
      )}
    >
      Sverto
    </span>
  )
}

function NavLink({ label, target }: { label: string; target: string }) {
  return (
    <a
      href={target}
      {...(isExternalTarget(target)
        ? { target: "_blank", rel: "noreferrer noopener" }
        : {})}
      className={cn(NAV_LINK, focusRing.sm)}
    >
      {label}
    </a>
  )
}


export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-[58px] items-center gap-4 px-5 md:px-8 lg:gap-7 lg:px-10 xl:h-[68px] xl:gap-9 xl:px-16">
        <a
          href="/"
          aria-label="Sverto home"
          className={cn("flex items-center gap-2.5", focusRing.sm)}
        >
          <SvertoMark className="size-5 xl:size-[22px]" />
          <Wordmark />
        </a>
        <nav
          aria-label="Primary"
          className="hidden items-center gap-5 lg:flex xl:gap-[26px]"
        >
          {LANDING_NAV.map((item) => (
            <NavLink key={item.label} label={item.label} target={item.target} />
          ))}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-3 xl:gap-3.5">
          <ThemeToggle />
          <a
            href={appUrl("/login")}
            className={cn("hidden md:inline-flex", NAV_LINK, focusRing.sm)}
          >
            Sign in
          </a>
          <Button
            nativeButton={false}
            render={<a href={appUrl("/signup")} />}
            className="h-9 rounded-button bg-brand px-[15px] text-[13px] font-semibold text-on-brand"
          >
            Get started free
          </Button>
        </div>
      </div>
    </header>
  )
}
