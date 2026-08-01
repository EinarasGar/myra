import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Truncate } from "@/components/primitives/truncate"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

import { useShellWidth } from "./breakpoints"

const DOCKED_SHADOW = "shadow-drawer"
const BOTTOM_SHADOW = "shadow-sheet-bottom"

export function AdaptiveSheet({
  open,
  onOpenChange,
  title,
  eyebrow,
  headerActions,
  footer,
  width = 404,
  children,
  className,
  initialFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  eyebrow?: ReactNode
  headerActions?: ReactNode
  footer?: ReactNode
  width?: number
  children: ReactNode
  className?: string
  initialFocus?: () => HTMLElement | null
}) {
  const shellWidth = useShellWidth()
  const bottom = shellWidth === "phone"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={bottom ? "bottom" : "right"}
        showCloseButton={false}
        {...(initialFocus === undefined ? {} : { initialFocus })}
        style={bottom ? undefined : { width, maxWidth: "100%" }}
        className={cn(
          "gap-0 border-border-strong bg-surface p-0 text-ink",
          bottom
            ? `max-h-[88svh] rounded-t-[14px] border-x border-t ${BOTTOM_SHADOW}`
            : `rounded-none border-l sm:max-w-none ${DOCKED_SHADOW}`,
          className
        )}
      >
        {bottom ? (
          <div className="flex flex-none justify-center pt-[9px] pb-1">
            <span
              aria-hidden
              className="h-1 w-[34px] rounded-full bg-border-strong"
            />
          </div>
        ) : null}

        <div
          className={cn(
            "flex flex-none items-start gap-3 border-b border-border",
            bottom ? "px-4 pt-[9px] pb-3" : "px-5 py-[15px]"
          )}
        >
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <span className="block text-[10px] leading-none font-semibold tracking-[0.12em] text-ink-3 uppercase">
                {eyebrow}
              </span>
            ) : null}
            <SheetTitle
              className={cn(
                "block font-bold tracking-[-0.01em] text-ink",
                eyebrow && "mt-2",
                bottom ? "text-[14px] leading-none" : "text-[15px] leading-none"
              )}
            >
              <Truncate className="block">{title}</Truncate>
            </SheetTitle>
          </div>
          {headerActions ? (
            <div
              data-slot="adaptive-sheet-actions"
              className="flex flex-none items-center gap-2"
            >
              {headerActions}
            </div>
          ) : null}
        </div>

        <div
          data-slot="adaptive-sheet-body"
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            bottom ? "px-4 pt-[15px] pb-4" : "p-5"
          )}
        >
          {children}
        </div>

        {footer ? (
          <div
            className={cn(
              "flex flex-none items-center gap-2 border-t border-border bg-surface-2",
              bottom ? "px-4 pt-[13px] pb-[18px]" : "px-5 py-[14px]"
            )}
          >
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
