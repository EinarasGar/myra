import { Link } from "@tanstack/react-router"

import { Figure } from "@/components/figure"
import type { ShellWidth } from "@/components/layout/breakpoints"
import {
  CountChip,
  DataCell,
  DataRow,
  EntityMark,
  FigureCell,
  focusRing,
  Truncate,
} from "@/components/primitives"
import { cn } from "@/lib/utils"

import { PENDING_ACCOUNT_ID } from "./api"
import { ConnectorStatus } from "./connector-status"
import { accountMetaParts, hasConnectorColumn } from "./presentation"
import type { AccountIndexRow } from "./rows"

export function AccountRow({
  row,
  width,
}: {
  row: AccountIndexRow
  width: ShellWidth
}) {
  const connectorColumn = hasConnectorColumn(width)
  const meta = accountMetaParts(row).join(" · ")
  const saving = row.accountId === PENDING_ACCOUNT_ID

  return (
    <DataRow
      size="two-line"
      interactive={!saving}
      className="relative h-[58px] focus-within:bg-surface-2"
    >
      <DataCell className="overflow-visible">
        <div className="flex min-w-0 items-center gap-[11px]">
          <EntityMark seed={row.accountId} label={row.name} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              {saving ? (
                <Truncate
                  text={row.name}
                  className="min-w-0 text-[13.5px] leading-[1.3] font-medium text-ink-2"
                />
              ) : (
                <Link
                  to="/accounts/$accountId"
                  params={{ accountId: row.accountId }}
                  className={cn(
                    "min-w-0 truncate text-[13.5px] leading-[1.3] font-medium outline-none",
                    "after:absolute after:inset-0 after:z-10 after:content-['']",
                    focusRing.row
                  )}
                >
                  <Truncate text={row.name} className="block" />
                </Link>
              )}
              {row.isJoint ? (
                <CountChip aria-hidden>
                  {Math.round(row.ownershipSharePercent)}%
                </CountChip>
              ) : null}
            </div>
            <Truncate
              text={meta}
              className="block text-[11px] leading-[1.5] text-ink-3"
            />
            {connectorColumn || row.connector === null ? null : (
              <ConnectorStatus connector={row.connector} className="mt-[3px]" />
            )}
          </div>
        </div>
      </DataCell>

      {connectorColumn ? (
        <DataCell className="overflow-visible">
          {row.connector === null ? null : (
            <ConnectorStatus connector={row.connector} />
          )}
        </DataCell>
      ) : null}

      <FigureCell>
        <Figure
          value={row.hasHoldings ? row.value : null}
          size="base"
          className="text-[14px] font-semibold"
          emptyLabel="No balance yet"
        />
        {row.unrealisedGains === null ? null : (
          <div className="mt-[6px]">
            <Figure
              value={row.unrealisedGains}
              intent="gainLoss"
              size="micro"
            />
            <span className="ms-[5px] font-sans text-[11px] leading-none text-ink-3">
              unrealised
            </span>
          </div>
        )}
      </FigureCell>

      {width === "phone" ? null : (
        <DataCell
          aria-hidden
          className="text-right text-[11px] leading-none text-ink-3"
        >
          ›
        </DataCell>
      )}
    </DataRow>
  )
}
