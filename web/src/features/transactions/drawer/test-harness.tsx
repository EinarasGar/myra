import { AdaptiveSheet } from "@/components/layout/adaptive-sheet"

import type { TransactionDrawerProps } from "./drawer-panel"
import { DRAWER_SHEET_CLASS, useDrawerPanel } from "./drawer-panel"

export function TransactionDrawer(props: TransactionDrawerProps) {
  const panel = useDrawerPanel(props)
  return (
    <AdaptiveSheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      eyebrow={panel.eyebrow}
      title={panel.title}
      width={panel.width}
      className={DRAWER_SHEET_CLASS}
      headerActions={panel.headerActions}
      footer={panel.footer}
    >
      {panel.body}
    </AdaptiveSheet>
  )
}
