import { cva } from "class-variance-authority"

import type { Direction, SignDisplay } from "@/lib/format"

export type FigureIntent =
  | "neutral"
  | "spending"
  | "inflow"
  | "gainLoss"
  | "negative"
  | "secondary"
  | "meta"
  | "ghost"

export type FigureTone =
  "neutral" | "positive" | "negative" | "secondary" | "meta" | "ghost"

export type FigureSize = "hero" | "lg" | "md" | "base" | "micro" | "delta"

export const figureVariants = cva("font-mono whitespace-nowrap tabular-nums", {
  variants: {
    size: {
      hero: "text-[30px] leading-none font-semibold tracking-[-0.045em] md:text-[36px] lg:text-[40px] xl:text-[52px]",
      lg: "text-[34px] leading-none font-semibold tracking-[-0.035em]",
      md: "text-[17px] leading-none font-semibold tracking-[-0.015em]",
      base: "text-[13.5px] leading-none font-medium",
      micro: "text-[11px] leading-none font-medium",
      delta: "text-[14px] leading-none font-semibold",
    },
    tone: {
      neutral: "text-ink",
      positive: "text-positive",
      negative: "text-negative",
      secondary: "text-ink-2",
      meta: "text-ink-3",
      ghost: "text-ghost",
    },
  },
  defaultVariants: {
    size: "base",
    tone: "neutral",
  },
})

export const DEFAULT_SIGN_BY_INTENT: Record<FigureIntent, SignDisplay> = {
  neutral: "auto",
  spending: "auto",
  inflow: "always",
  gainLoss: "always",
  negative: "auto",
  secondary: "auto",
  meta: "auto",
  ghost: "auto",
}

export function resolveFigureTone(
  intent: FigureIntent,
  direction: Direction
): FigureTone {
  const tone = intentTone(intent, direction)
  return direction === 0 && isColouredTone(tone) ? "neutral" : tone
}

function intentTone(intent: FigureIntent, direction: Direction): FigureTone {
  switch (intent) {
    case "inflow":
      return "positive"
    case "negative":
      return "negative"
    case "secondary":
      return "secondary"
    case "meta":
      return "meta"
    case "ghost":
      return "ghost"
    case "gainLoss":
      if (direction > 0) return "positive"
      return direction < 0 ? "negative" : "neutral"
    default:
      return "neutral"
  }
}

export function isColouredTone(tone: FigureTone): boolean {
  return tone === "positive" || tone === "negative"
}
