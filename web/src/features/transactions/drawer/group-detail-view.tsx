import { Figure } from "@/components/figure"
import { CountChip, InlineRowAction, StatusChip } from "@/components/primitives"
import { accountLabel } from "@/lib/domain/refs"
import { countOf, formatDateStamp } from "@/lib/format"

import type { LedgerGroupRow, NativeAmount } from "../api"
import { nativeFigureProps } from "../api"
import { GroupMemberLine } from "../editor"

import { DetailRow, SectionLabel } from "./detail-parts"
import { groupCashAmounts } from "./group-amounts"
import { NET_EFFECT_NOTE } from "./transaction-detail-view"

export const GROUP_DATE_NOTE =
  "A group carries its own date — when the collection of transactions occurred — and files under it in the ledger. The transactions inside keep the dates they already had."

export const GROUP_TOTAL_NOTE =
  "One figure per asset. Nothing converts between assets, so a group spanning two currencies shows two figures and never one total."

export const GROUP_ONE_ROW_NOTE =
  "A group is one ledger row holding several transactions. Day nets and counts are unchanged by grouping."

export const GROUP_CHILD_OPEN_NOTE =
  "Open a transaction to edit it. Editing the group changes only the line the ledger shows."

function FigureList({
  amounts,
  emptyLabel,
}: {
  amounts: readonly NativeAmount[]
  emptyLabel: string
}) {
  if (amounts.length === 0) {
    return <Figure value={null} emptyLabel={emptyLabel} />
  }
  return (
    <span className="flex flex-wrap justify-end gap-x-3 gap-y-1">
      {amounts.map((amount) => (
        <Figure
          key={String(amount.asset.assetId)}
          {...nativeFigureProps(amount)}
          intent="neutral"
          sign="always"
          className="text-ink-2"
        />
      ))}
    </span>
  )
}

export function GroupDrawerHero({ group }: { group: LedgerGroupRow }) {
  return (
    <section
      data-slot="group-drawer-hero"
      className="border-b border-border px-5 pt-[22px] pb-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          data-slot="group-type-chip"
          className="inline-flex flex-none items-center rounded-chip bg-brand-dim px-[7px] py-[5px] text-[10px] leading-none font-semibold tracking-[0.08em] text-brand uppercase"
        >
          Group
        </span>
        <span className="font-mono text-[11px] leading-none font-medium text-ink-3">
          {formatDateStamp(group.date, { year: "always" })}
        </span>
        <CountChip>{group.childCount}</CountChip>
        {group.isUnreviewed ? (
          <StatusChip status="unreviewed" size="row" />
        ) : null}
      </div>

      <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {group.amountsByAsset.length === 0 ? (
          <Figure
            value={null}
            size="lg"
            emptyLabel="This group has no entries"
          />
        ) : (
          group.amountsByAsset.map((amount) => (
            <Figure
              key={String(amount.asset.assetId)}
              {...nativeFigureProps(amount)}
              intent={group.figureIntent}
              size="lg"
            />
          ))
        )}
      </p>

      <p className="mt-[7px] text-[12px] leading-[1.5] text-ink-3">
        {countOf(group.childCount, "transaction")}
        {group.category === null ? "" : ` · ${group.category.name}`}
      </p>
      <p className="mt-[10px] text-[11px] leading-[1.5] text-pretty text-ink-3">
        {GROUP_TOTAL_NOTE}
      </p>
    </section>
  )
}

export function GroupDrawerChildren({
  group,
  onOpenChild,
  onRemoveChild,
  isRemoving = false,
}: {
  group: LedgerGroupRow
  onOpenChild?: (transactionId: string) => void
  onRemoveChild?: (transactionId: string) => void
  isRemoving?: boolean
}) {
  return (
    <section
      data-slot="group-drawer-children"
      className="border-b border-border px-5 pt-4 pb-[18px]"
    >
      <SectionLabel>Transactions</SectionLabel>
      <ul className="mt-1">
        {group.children.map((child) => (
          <GroupMemberLine
            key={child.rowId}
            row={child}
            {...(onOpenChild === undefined
              ? {}
              : {
                  onOpen: () => {
                    onOpenChild(child.transactionId)
                  },
                })}
            {...(onRemoveChild === undefined
              ? {}
              : {
                  action: (
                    <InlineRowAction
                      disabled={isRemoving}
                      onClick={() => {
                        onRemoveChild(child.transactionId)
                      }}
                    >
                      Remove
                    </InlineRowAction>
                  ),
                })}
          />
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-[1.5] text-pretty text-ink-3">
        {onOpenChild === undefined ? GROUP_ONE_ROW_NOTE : GROUP_CHILD_OPEN_NOTE}
      </p>
    </section>
  )
}

export function GroupDrawerDetails({ group }: { group: LedgerGroupRow }) {
  const cash = groupCashAmounts(group)
  const unreviewed = group.children.filter((child) => child.isUnreviewed).length

  return (
    <section
      data-slot="group-drawer-details"
      className="flex flex-col gap-[11px] border-b border-border px-5 pt-4 pb-[18px]"
    >
      <SectionLabel>Details</SectionLabel>
      <DetailRow label="Group date">
        {formatDateStamp(group.date, { year: "always" })}
      </DetailRow>
      <DetailRow label="Category">
        {group.category?.name ?? (
          <Figure value={null} emptyLabel="No category set" />
        )}
      </DetailRow>
      <DetailRow label="Transactions">
        <Figure value={group.childCount} kind="plain" />
      </DetailRow>
      <DetailRow label="Accounts">
        {group.accounts.length === 0 ? (
          <Figure value={null} emptyLabel="No accounts" />
        ) : (
          group.accounts.map((account) => accountLabel(account)).join(", ")
        )}
      </DetailRow>
      <DetailRow label="Net cash effect">
        <FigureList amounts={cash} emptyLabel="No cash moved" />
      </DetailRow>
      <DetailRow label="Status">
        {unreviewed === 0
          ? "All reviewed"
          : `${countOf(unreviewed, "transaction")} unreviewed`}
      </DetailRow>
      <p className="text-[11px] leading-[1.5] text-pretty text-ink-3">
        {GROUP_DATE_NOTE}
      </p>
      <p className="text-[11px] leading-[1.5] text-pretty text-ink-3">
        {NET_EFFECT_NOTE}
      </p>
    </section>
  )
}
