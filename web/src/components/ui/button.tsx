import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/components/primitives/focus-ring"

const buttonVariants = cva(
  `group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent bg-clip-padding text-xs font-semibold whitespace-nowrap transition-colors duration-instant ease-out-quick outline-none select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 ${FOCUS_RING}`,
  {
    variants: {
      variant: {
        default: "bg-brand text-on-brand hover:bg-brand/90",
        outline:
          "border-border-strong bg-transparent text-ink hover:bg-surface-2 aria-expanded:bg-surface-2",
        secondary:
          "bg-surface-2 text-ink hover:bg-[color-mix(in_oklch,var(--sv-panel-2),var(--sv-ink)_5%)] aria-expanded:bg-surface-2",
        ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
        destructive:
          "border-negative bg-transparent text-negative hover:bg-negative-dim",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-[26px] gap-1.5 px-[13px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-[31px] gap-1.5 rounded-button px-[15px] text-[12.5px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
