import { SyncDot, Truncate } from "@/components/primitives"
import { cn } from "@/lib/utils"

import type { AccountConnector } from "./api"
import { connectorNote } from "./presentation"

export function ConnectorStatus({
  connector,
  note = true,
  className,
}: {
  connector: AccountConnector
  note?: boolean
  className?: string
}) {
  const detail = note ? connectorNote(connector) : null

  return (
    <span
      data-slot="connector-status"
      className={cn("flex min-w-0 items-center gap-[7px]", className)}
    >
      <SyncDot status={connector.statusWord} className="flex-none" />
      {detail === null ? null : (
        <Truncate
          text={detail}
          className="min-w-0 text-[11px] leading-[1.4] text-ink-3"
        />
      )}
    </span>
  )
}
