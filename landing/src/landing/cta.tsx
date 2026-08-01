import type * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { appUrl } from "./app-url"
import { LANDING_SOURCE_URL } from "./links"

const CTA = "h-11 rounded-button px-[22px] text-[14px] font-semibold"

export function StartFreeButton({
  className,
  children = "Get started free",
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <Button
      nativeButton={false}
      render={<a href={appUrl("/signup")} />}
      className={cn(CTA, "bg-brand text-on-brand", className)}
    >
      {children}
    </Button>
  )
}

export function SecondaryLinkButton({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<a href={href} target="_blank" rel="noreferrer noopener" />}
      className={cn(CTA, className)}
    >
      {children}
    </Button>
  )
}

export function SourceButton({ className }: { className?: string }) {
  return (
    <SecondaryLinkButton href={LANDING_SOURCE_URL} className={className}>
      <GithubGlyph />
      Read the source
    </SecondaryLinkButton>
  )
}

export function GithubGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cn("size-[15px] fill-current", className)}
    >
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.36-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.19c0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}
