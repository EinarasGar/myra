import type { Page } from "@playwright/test"

export const SHELL_WIDTHS = ["phone", "stacked", "tight", "full"] as const

export type ShellWidth = (typeof SHELL_WIDTHS)[number]

export function shellWidthFor(viewportWidth: number): ShellWidth {
  if (viewportWidth >= 1280) return "full"
  if (viewportWidth >= 1024) return "tight"
  if (viewportWidth >= 768) return "stacked"
  return "phone"
}

export function shellWidthOf(page: Page): ShellWidth {
  return shellWidthFor(page.viewportSize()?.width ?? 1280)
}

export function hasKeyboardAffordances(width: ShellWidth): boolean {
  return width === "tight" || width === "full"
}
