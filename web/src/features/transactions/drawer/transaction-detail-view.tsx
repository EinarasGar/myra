import { Figure } from "@/components/figure"
import { assetLabel, accountLabel, isCurrencyAsset } from "@/lib/domain/refs"
import { impliedUnitPrice } from "@/lib/domain/transaction-types"
import { formatDateStamp } from "@/lib/format"
import { InlineRowAction, StatusChip } from "@/components/primitives"

import type { LedgerTransactionRow } from "../api"
import { assetUnitsOf, nativeFigureProps, sumByAsset } from "../api"

import { DetailRow, SectionLabel } from "./detail-parts"

export const NO_PROVENANCE_DETAIL =
  "Not recorded — Sverto does not keep where a transaction came from."

export const NET_EFFECT_NOTE =
  "Cash only. Units changing hands are not valued here: no transaction carries a base-currency amount, so a purchase shows the cash leaving and no offsetting figure for what it bought."

function TypeChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-slot="drawer-type-chip"
      className="inline-flex flex-none items-center rounded-chip bg-brand-dim px-[7px] py-[5px] text-[10px] leading-none font-semibold tracking-[0.08em] text-brand uppercase"
    >
      {children}
    </span>
  )
}

function unitPriceOf(row: LedgerTransactionRow) {
  const units = row.legs.find((leg) => leg.amountKind === "units")
  const cash = row.legs.find((leg) => leg.amountKind === "cash")
  if (units === undefined || cash === undefined) return null
  const price = impliedUnitPrice(
    assetUnitsOf(units.amount),
    assetUnitsOf(cash.amount)
  )
  if (price === null) return null
  return { price, currency: assetLabel(cash.amount.asset) }
}

function currencyAmounts(row: LedgerTransactionRow) {
  const amounts = [
    ...row.legs.map((leg) => leg.amount),
    ...row.fees.map((fee) => fee.amount),
  ].filter((amount) => isCurrencyAsset(amount.asset))
  return sumByAsset(amounts)
}

function feeAmounts(row: LedgerTransactionRow) {
  return sumByAsset(row.fees.map((fee) => fee.amount))
}

export function DrawerHero({
  row,
  onMarkReviewed,
  isMarkingReviewed,
}: {
  row: LedgerTransactionRow
  onMarkReviewed?: () => void
  isMarkingReviewed?: boolean
}) {
  const context = [
    row.accounts.map((account) => accountLabel(account)).join(" → "),
    row.category?.name,
  ]
    .filter((part) => part !== undefined && part !== "")
    .join(" · ")

  return (
    <section
      data-slot="drawer-hero"
      className="border-b border-border px-5 pt-[22px] pb-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <TypeChip>{row.typeName}</TypeChip>
        <span className="font-mono text-[11px] leading-none font-medium text-ink-3">
          {formatDateStamp(row.date, { year: "always" })}
        </span>
        {row.isUnreviewed ? (
          <StatusChip status="unreviewed" size="row" />
        ) : null}
        {row.isUnreviewed && onMarkReviewed ? (
          <InlineRowAction
            onClick={onMarkReviewed}
            disabled={isMarkingReviewed === true}
          >
            Mark reviewed
          </InlineRowAction>
        ) : null}
      </div>

      {row.description.detail ? (
        <p className="mt-[14px] font-mono text-[11.5px] leading-[1.4] text-ink-3">
          {row.description.detail}
        </p>
      ) : null}

      <p className="mt-3">
        {row.primaryAmount === null ? (
          <Figure
            value={null}
            size="lg"
            emptyLabel="This transaction has no entries"
          />
        ) : (
          <Figure
            {...nativeFigureProps(row.primaryAmount)}
            intent={row.figureIntent}
            size="lg"
          />
        )}
      </p>

      {context === "" ? null : (
        <p className="mt-[7px] text-[12px] leading-[1.5] text-ink-3">
          {context}
        </p>
      )}
    </section>
  )
}

export function DrawerEntries({ row }: { row: LedgerTransactionRow }) {
  const net = currencyAmounts(row)

  return (
    <section
      data-slot="drawer-entries"
      className="border-b border-border px-5 pt-4 pb-[18px]"
    >
      <SectionLabel>Entries</SectionLabel>
      <ul className="mt-1">
        {row.legs.map((leg) => (
          <li
            key={`leg-${String(leg.entryId)}`}
            className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border py-[11px]"
          >
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] leading-[1.3] font-medium">
                {assetLabel(leg.amount.asset)}
              </span>
              <span className="block truncate text-[11px] leading-[1.5] text-ink-3">
                {accountLabel(leg.account)} · {leg.label}
              </span>
            </span>
            <Figure
              {...nativeFigureProps(leg.amount)}
              sign="always"
              className="text-right"
            />
          </li>
        ))}
        {row.fees.map((fee) => (
          <li
            key={`fee-${String(fee.entryId)}`}
            className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border py-[11px]"
          >
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] leading-[1.3] font-medium">
                {assetLabel(fee.amount.asset)}
              </span>
              <span className="block truncate text-[11px] leading-[1.5] text-ink-3">
                {accountLabel(fee.account)} · fee
              </span>
            </span>
            <Figure
              {...nativeFigureProps(fee.amount)}
              sign="always"
              className="text-right"
            />
          </li>
        ))}
      </ul>

      <div
        data-slot="drawer-net-effect"
        className="flex items-baseline justify-between gap-3 pt-[11px]"
      >
        <span className="text-[11.5px] leading-none text-ink-3">
          Net cash effect
        </span>
        <span className="flex flex-wrap justify-end gap-x-3 gap-y-1">
          {net.length === 0 ? (
            <Figure value={null} emptyLabel="No cash moved" />
          ) : (
            net.map((amount) => (
              <Figure
                key={String(amount.asset.assetId)}
                {...nativeFigureProps(amount)}
                intent="neutral"
                sign="always"
                className="text-ink-2"
              />
            ))
          )}
        </span>
      </div>
      <p className="mt-[10px] text-[11px] leading-[1.5] text-pretty text-ink-3">
        {NET_EFFECT_NOTE}
      </p>
    </section>
  )
}

export const GROUP_UNNAMED = "In a group that is not loaded here"

export function DrawerDetails({
  row,
  groupLabel = null,
}: {
  row: LedgerTransactionRow
  groupLabel?: string | null
}) {
  const unitPrice = unitPriceOf(row)
  const fees = feeAmounts(row)

  return (
    <section
      data-slot="drawer-details"
      className="flex flex-col gap-[11px] border-b border-border px-5 pt-4 pb-[18px]"
    >
      <SectionLabel>Details</SectionLabel>
      <DetailRow label="Date">
        {formatDateStamp(row.date, { year: "always" })}
      </DetailRow>
      <DetailRow label="Type">{row.typeName}</DetailRow>
      <DetailRow label="Category">
        {row.categorySupported ? (
          (row.category?.name ?? (
            <Figure value={null} emptyLabel="No category set" />
          ))
        ) : (
          <Figure
            value={null}
            emptyLabel={`${row.typeName} carries no category`}
          />
        )}
      </DetailRow>
      <DetailRow label="Unit price">
        {unitPrice === null ? (
          <Figure value={null} emptyLabel="Not a unit trade" />
        ) : (
          <Figure value={unitPrice.price} currency={unitPrice.currency} />
        )}
      </DetailRow>
      <DetailRow label="Fees">
        {fees.length === 0 ? (
          <Figure value={null} emptyLabel="No fees" />
        ) : (
          <span className="flex flex-wrap justify-end gap-x-2">
            {fees.map((fee) => (
              <Figure
                key={String(fee.asset.assetId)}
                {...nativeFigureProps(fee)}
              />
            ))}
          </span>
        )}
      </DetailRow>
      <DetailRow label="Group">
        {row.groupId === null ? (
          <Figure value={null} emptyLabel="Not in a group" />
        ) : (
          (groupLabel ?? <span className="text-ink-3">{GROUP_UNNAMED}</span>)
        )}
      </DetailRow>
      <DetailRow label="Status">
        {row.isUnreviewed ? "Unreviewed" : row.isHidden ? "Hidden" : "Reviewed"}
      </DetailRow>
      <DetailRow label="Source">
        <span className="text-ink-3">{NO_PROVENANCE_DETAIL}</span>
      </DetailRow>
    </section>
  )
}
