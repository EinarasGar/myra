import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field"

import { cn } from "@/lib/utils"
import { focusRing } from "@/components/primitives/focus-ring"

function NumberField({ ...props }: NumberFieldPrimitive.Root.Props) {
  return <NumberFieldPrimitive.Root data-slot="number-field" {...props} />
}

function NumberFieldGroup({
  className,
  ...props
}: NumberFieldPrimitive.Group.Props) {
  return (
    <NumberFieldPrimitive.Group
      data-slot="number-field-group"
      className={cn(
        "flex items-stretch overflow-hidden rounded-md border border-border-strong bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function NumberFieldInput({
  className,
  ...props
}: NumberFieldPrimitive.Input.Props) {
  return (
    <NumberFieldPrimitive.Input
      data-slot="number-field-input"
      className={cn(
        "h-10 w-full min-w-0 bg-transparent px-[13px] py-[11px] text-[12.5px] leading-none font-medium text-ink transition-colors duration-instant ease-out-quick outline-none placeholder:text-ink-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        focusRing.md,
        className
      )}
      {...props}
    />
  )
}

export { NumberField, NumberFieldGroup, NumberFieldInput }
