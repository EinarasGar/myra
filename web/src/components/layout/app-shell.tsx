import type { ReactNode } from "react"
import { useRouterState } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

import { BottomTabBar } from "./bottom-tab-bar"
import { useShellWidth } from "./breakpoints"
import { IconRail } from "./icon-rail"
import { APP_NAME, destinationFor } from "./navigation"
import { PageContainer } from "./page-container"
import { CompactTopBar, DesktopTopBar } from "./top-bar"

export function AppShell({ children }: { children: ReactNode }) {
  const width = useShellWidth()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const destination = destinationFor(pathname)
  const compact = width === "phone" || width === "stacked"

  return (
    <div className="flex min-h-svh bg-background">
      {compact ? null : <IconRail pathname={pathname} />}
      <div className="flex min-w-0 flex-1 flex-col">
        {compact ? (
          <CompactTopBar title={destination?.title ?? APP_NAME} />
        ) : (
          <DesktopTopBar />
        )}
        <main
          className={cn(
            "min-w-0 flex-1",
            width === "phone" && "pb-[calc(56px+env(safe-area-inset-bottom))]"
          )}
        >
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
      {width === "phone" ? <BottomTabBar pathname={pathname} /> : null}
    </div>
  )
}
