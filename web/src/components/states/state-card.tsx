import type * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Panel, PanelFootnote } from "@/components/primitives/panel"

export type StateAction = {
  label: string
  onClick?: () => void
  kind?: "primary" | "secondary" | "danger"
}

const ACTION_VARIANT = {
  primary: "default",
  secondary: "outline",
  danger: "destructive",
} as const

export function StateActions({
  actions,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  actions: readonly StateAction[]
}) {
  if (actions.length === 0) return null

  return (
    <div
      data-slot="state-actions"
      className={cn("mt-[14px] flex flex-wrap gap-2", className)}
      {...props}
    >
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={ACTION_VARIANT[action.kind ?? "secondary"]}
          onClick={action.onClick}
          className="h-auto rounded-sm px-[13px] py-[7px] text-[11.5px] leading-none font-semibold"
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}

export function StateCard({
  footnote,
  children,
  className,
  ...props
}: React.ComponentProps<"section"> & { footnote?: React.ReactNode }) {
  return (
    <Panel data-slot="state-card" className={className} {...props}>
      {children}
      {footnote ? <PanelFootnote>{footnote}</PanelFootnote> : null}
    </Panel>
  )
}
