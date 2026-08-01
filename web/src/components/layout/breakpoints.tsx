/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useSyncExternalStore } from "react"
import type { ReactNode } from "react"
import { flushSync } from "react-dom"

export const SHELL_WIDTHS = ["phone", "stacked", "tight", "full"] as const

export type ShellWidth = (typeof SHELL_WIDTHS)[number]

export const SHELL_BREAKPOINTS = {
  stacked: 768,
  tight: 1024,
  full: 1280,
} as const

const MEDIA_QUERIES = {
  stacked: `(min-width: ${SHELL_BREAKPOINTS.stacked}px)`,
  tight: `(min-width: ${SHELL_BREAKPOINTS.tight}px)`,
  full: `(min-width: ${SHELL_BREAKPOINTS.full}px)`,
} as const

const SERVER_WIDTH: ShellWidth = "full"

function canMatchMedia(): boolean {
  return (
    typeof window !== "undefined" && typeof window.matchMedia === "function"
  )
}

export function shellWidthFor(viewportWidth: number): ShellWidth {
  if (viewportWidth >= SHELL_BREAKPOINTS.full) return "full"
  if (viewportWidth >= SHELL_BREAKPOINTS.tight) return "tight"
  if (viewportWidth >= SHELL_BREAKPOINTS.stacked) return "stacked"
  return "phone"
}

function readShellWidth(): ShellWidth {
  if (!canMatchMedia()) return SERVER_WIDTH
  if (window.matchMedia(MEDIA_QUERIES.full).matches) return "full"
  if (window.matchMedia(MEDIA_QUERIES.tight).matches) return "tight"
  if (window.matchMedia(MEDIA_QUERIES.stacked).matches) return "stacked"
  return "phone"
}

const subscribers = new Set<() => void>()

let mediaLists: MediaQueryList[] | null = null

/**
 * React flushes a sync store update per subscriber, and effects subscribe child before parent,
 * so notifying one at a time renders a child against a width its parent has not reached yet.
 */
function notifySubscribers(): void {
  flushSync(() => {
    for (const subscriber of [...subscribers]) subscriber()
  })
}

function subscribeToShellWidth(onChange: () => void): () => void {
  if (!canMatchMedia()) return () => {}
  subscribers.add(onChange)
  if (mediaLists === null) {
    mediaLists = Object.values(MEDIA_QUERIES).map((query) =>
      window.matchMedia(query)
    )
    for (const list of mediaLists) {
      list.addEventListener("change", notifySubscribers)
    }
  }
  return () => {
    subscribers.delete(onChange)
    if (subscribers.size > 0 || mediaLists === null) return
    for (const list of mediaLists) {
      list.removeEventListener("change", notifySubscribers)
    }
    mediaLists = null
  }
}

function subscribeToNothing(): () => void {
  return () => {}
}

function readServerWidth(): ShellWidth {
  return SERVER_WIDTH
}

const ShellWidthContext = createContext<ShellWidth | null>(null)

/**
 * Every consumer in a tree has to change width in one render pass: a parent that sheds a
 * column and the child grid it lays out on cannot be allowed to disagree for a commit.
 */
export function ShellWidthProvider({ children }: { children: ReactNode }) {
  const width = useSyncExternalStore(
    subscribeToShellWidth,
    readShellWidth,
    readServerWidth
  )
  return <ShellWidthContext value={width}>{children}</ShellWidthContext>
}

export function useShellWidth(): ShellWidth {
  const provided = useContext(ShellWidthContext)
  const measured = useSyncExternalStore(
    provided === null ? subscribeToShellWidth : subscribeToNothing,
    provided === null ? readShellWidth : readServerWidth,
    readServerWidth
  )
  return provided ?? measured
}

export function useHasKeyboardAffordances(): boolean {
  const width = useShellWidth()
  return width === "tight" || width === "full"
}

export const PAGE_PADDING_X = "px-4 md:px-5 lg:px-7 xl:px-10"

export const PAGE_PADDING_BOTTOM = "pb-[18px] md:pb-6 lg:pb-7 xl:pb-10"

export const CONTENT_MAX_WIDTH = "mx-auto w-full max-w-[1280px]"

export const KEYBOARD_ONLY = "hidden lg:inline-flex"
