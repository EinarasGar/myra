"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives/focus-ring"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors duration-instant ease-out-quick outline-none after:absolute after:-inset-x-3 after:-inset-y-2 aria-invalid:border-destructive data-[size=default]:h-[19px] data-[size=default]:w-[34px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] data-checked:bg-brand data-unchecked:border-border-strong data-unchecked:bg-surface-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        focusRing.pill,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full ring-0 transition-transform duration-instant ease-out-quick group-data-[size=default]/switch:size-[14px] group-data-[size=sm]/switch:size-3 data-checked:bg-on-brand group-data-[size=default]/switch:data-checked:translate-x-[calc(100%+3.5px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] data-unchecked:bg-ink-3 group-data-[size=default]/switch:data-unchecked:translate-x-[2px] group-data-[size=sm]/switch:data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
