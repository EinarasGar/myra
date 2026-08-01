import { AdaptiveSheet } from "@/components/layout/adaptive-sheet"

import type { GroupDrawerProps } from "./group-panel"
import { useGroupDrawerPanel } from "./group-panel"
import { DRAWER_SHEET_CLASS } from "./drawer-panel"

export function GroupDrawer(props: GroupDrawerProps) {
  const panel = useGroupDrawerPanel(props)
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
