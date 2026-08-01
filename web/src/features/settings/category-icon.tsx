import type { ComponentProps } from "react"
import { DynamicIcon } from "lucide-react/dynamic"

import { cn } from "@/lib/utils"

type IconName = ComponentProps<typeof DynamicIcon>["name"]

function IconDot() {
  return (
    <span
      aria-hidden
      className="inline-block size-[5px] rounded-full bg-current"
    />
  )
}

export function CategoryIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const trimmed = name.trim()
  if (trimmed === "") return <IconDot />
  return (
    <DynamicIcon
      name={trimmed as IconName}
      aria-hidden
      fallback={IconDot}
      className={cn("size-[13px] stroke-[1.8]", className)}
    />
  )
}
