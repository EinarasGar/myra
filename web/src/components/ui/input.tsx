import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives/focus-ring"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-border-strong bg-transparent px-[13px] py-[11px] text-[12.5px] leading-none font-medium text-ink transition-colors duration-instant ease-out-quick outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink placeholder:text-ink-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        focusRing.md,
        className
      )}
      {...props}
    />
  )
}

export { Input }
