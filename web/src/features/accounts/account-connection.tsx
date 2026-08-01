import { Link } from "@tanstack/react-router"

import { StatusChip, Truncate } from "@/components/primitives"

import type { AccountConnector } from "./api"
import { connectorNote } from "./presentation"

export function AccountConnection({
  connector,
}: {
  connector: AccountConnector
}) {
  return (
    <div
      data-slot="account-connection"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-panel border border-border bg-surface px-[18px] py-[13px]"
    >
      <StatusChip status={connector.statusWord} />
      <Truncate
        text={connectorNote(connector)}
        className="min-w-0 flex-1 text-[11.5px] leading-[1.4] text-ink-3"
      />
      <span className="flex-none text-[11.5px] leading-[1.4] text-ink-3">
        {connector.writesPostDirectly
          ? "Trusted writes on — imports post directly"
          : "Trusted writes off — imports arrive for review"}
      </span>
      <Link
        to="/settings"
        search={{
          section: "connections",
          connection: connector.connectionId,
        }}
        className="flex-none text-[11.5px] leading-none font-semibold text-brand"
      >
        Manage
      </Link>
    </div>
  )
}
