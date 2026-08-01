import { Figure } from "@/components/figure"
import { useShellWidth } from "@/components/layout/breakpoints"
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
  DataTableHeaderRow,
  Panel,
} from "@/components/primitives"
import { cn } from "@/lib/utils"

import { AccountRow } from "./account-row"
import {
  ACCOUNT_ROW_COLUMNS,
  ACCOUNT_ROW_GAP,
  ACCOUNT_ROW_PADDING,
  hasConnectorColumn,
} from "./presentation"
import type { AccountIndexGroup } from "./rows"

function GroupHeader({ group }: { group: AccountIndexGroup }) {
  return (
    <div className="mb-[11px] flex items-center gap-[10px]">
      <span
        aria-hidden
        className={cn("size-[7px] flex-none rounded-chip", group.swatch)}
      />
      <h2 className="flex-none text-[10px] leading-none font-semibold tracking-[0.12em] uppercase">
        {group.label}
      </h2>
      <span className="flex-none text-[10.5px] leading-none text-ink-3">
        {group.accounts.length}
        {group.accounts.length === 1 ? " account" : " accounts"}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border" />
      <Figure
        value={group.subtotal}
        size="base"
        className="text-[12.5px] font-semibold"
      />
    </div>
  )
}

export function AccountGroup({ group }: { group: AccountIndexGroup }) {
  const width = useShellWidth()
  const connectorColumn = hasConnectorColumn(width)

  return (
    <section data-slot="account-group" data-class={group.accountClass}>
      <GroupHeader group={group} />
      <Panel>
        <DataTable
          columns={ACCOUNT_ROW_COLUMNS}
          gap={ACCOUNT_ROW_GAP}
          padding={ACCOUNT_ROW_PADDING}
          aria-label={`${group.label} accounts`}
        >
          <DataTableHead className="sr-only">
            <DataTableHeaderRow>
              <DataTableHeaderCell>Account</DataTableHeaderCell>
              {connectorColumn ? (
                <DataTableHeaderCell>Connection</DataTableHeaderCell>
              ) : null}
              <DataTableHeaderCell numeric>Balance</DataTableHeaderCell>
              {width === "phone" ? null : (
                <DataTableHeaderCell>
                  <span className="sr-only">Open</span>
                </DataTableHeaderCell>
              )}
            </DataTableHeaderRow>
          </DataTableHead>
          <DataTableBody className="[&>tr:last-child]:border-b-0">
            {group.accounts.map((row) => (
              <AccountRow key={row.accountId} row={row} width={width} />
            ))}
          </DataTableBody>
        </DataTable>
      </Panel>
      {group.ratelessCount === 0 ? null : (
        <p className="mt-[10px] text-[11px] leading-[1.5] text-pretty text-ink-3">
          {group.ratelessCount} holding
          {group.ratelessCount === 1 ? " here has" : "s here have"} no rate to
          your base currency, so this subtotal is short by that much.
        </p>
      )}
    </section>
  )
}
