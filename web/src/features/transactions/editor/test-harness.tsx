import { AdaptiveSheet } from "@/components/layout/adaptive-sheet"

import type { TransactionEditorProps } from "./editor-panel"
import { EDITOR_SHEET_CLASS, useEditorPanel } from "./editor-panel"

export function TransactionEditor(props: TransactionEditorProps) {
  const panel = useEditorPanel(props)
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
      className={EDITOR_SHEET_CLASS}
      headerActions={panel.headerActions}
      footer={panel.footer}
    >
      {panel.body}
    </AdaptiveSheet>
  )
}
