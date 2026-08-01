import type { ComponentProps } from "react"
import type { LucideIcon } from "lucide-react"
import { DynamicIcon } from "lucide-react/dynamic"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type DynamicIconName = ComponentProps<typeof DynamicIcon>["name"]

export type RowGlyphIcon = LucideIcon | string

export type RowGlyphTone = "in" | "out" | "neutral"

const TONE_CLASS: Record<RowGlyphTone, string> = {
  in: "text-positive",
  out: "text-ink-2",
  neutral: "text-ink-3",
}

function GlyphDot() {
  return (
    <span
      aria-hidden
      className="inline-block size-[5px] rounded-full bg-current"
    />
  )
}

export function GlyphIcon({
  icon: Icon,
  className,
}: {
  icon: RowGlyphIcon
  className?: string
}) {
  const size = cn("size-[13px] stroke-[1.8]", className)
  if (typeof Icon === "string") {
    return (
      <DynamicIcon
        name={Icon as DynamicIconName}
        aria-hidden
        fallback={GlyphDot}
        className={size}
      />
    )
  }
  return <Icon aria-hidden className={size} />
}

export function RowGlyph({
  icon,
  label,
  tone = "neutral",
  muted = false,
  className,
}: {
  icon: RowGlyphIcon
  label: string
  tone?: RowGlyphTone
  muted?: boolean
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            data-slot="row-glyph"
            data-tone={tone}
            className={cn(
              "mx-auto flex items-center justify-center outline-none",
              muted ? "text-ghost" : TONE_CLASS[tone],
              className
            )}
          />
        }
      >
        <GlyphIcon icon={icon} />
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
