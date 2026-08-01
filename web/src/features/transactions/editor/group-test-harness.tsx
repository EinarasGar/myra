import { AdaptiveSheet } from "@/components/layout/adaptive-sheet"

import type { GroupEditorProps } from "./group-editor-panel"
import {
  GROUP_EDITOR_SHEET_CLASS,
  useGroupEditorPanel,
} from "./group-editor-panel"

export function GroupEditor(props: GroupEditorProps) {
  const panel = useGroupEditorPanel(props)
  return (
    <AdaptiveSheet
      open={props.open}
      onOpenChange={(next) => {
        if (next) return
        panel.requestClose()
      }}
      eyebrow={panel.eyebrow}
      title={panel.title}
      width={panel.width}
      initialFocus={panel.initialFocus}
      className={GROUP_EDITOR_SHEET_CLASS}
      headerActions={panel.headerActions}
      footer={panel.footer}
    >
      {panel.body}
    </AdaptiveSheet>
  )
}
