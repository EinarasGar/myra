import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CircleCheck } from "lucide-react"

import { isCurrencyAssetType } from "@/lib/domain/refs"
import { formatDateStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Figure } from "@/components/figure"
import { focusRing, MetaChip, Truncate } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { useAccounts } from "@/features/accounts/api"
import { assetQueryOptions } from "@/features/assets/api"
import { categoriesQueryOptions } from "@/features/categories/api"

import { toProposalView, type ProposalField, type ProposalPart } from "../api"
import {
  APPROVAL_FOOT,
  APPROVAL_HEADLINE,
  APPROVAL_INTRO,
  APPROVAL_NET_EFFECT_REFUSAL,
  APPROVE,
  APPROVED_LABEL,
  DENIED_LABEL,
  DENIED_RECEIPT,
  DENY,
} from "../copy"

function AssetAmount({
  value,
  assetId,
}: {
  value: number
  assetId: number | null
}) {
  const asset = useQuery({
    ...assetQueryOptions(assetId ?? 0),
    enabled: assetId !== null,
  })

  if (assetId === null || asset.data === undefined) {
    return <Figure value={value} kind="plain" size="md" />
  }
  if (isCurrencyAssetType(asset.data.assetType.id)) {
    return (
      <Figure
        value={value}
        kind="money"
        currency={asset.data.ticker}
        size="md"
      />
    )
  }
  return (
    <Figure value={value} kind="units" ticker={asset.data.ticker} size="md" />
  )
}

function AssetName({ assetId }: { assetId: number }) {
  const asset = useQuery(assetQueryOptions(assetId))
  return <span>{asset.data?.ticker ?? `Asset ${String(assetId)}`}</span>
}

function CategoryName({
  categoryId,
  userId,
}: {
  categoryId: number
  userId: string
}) {
  const categories = useQuery(categoriesQueryOptions(userId))
  const name = categories.data?.find(
    (category) => category.id === categoryId
  )?.name
  return <span>{name ?? `Category ${String(categoryId)}`}</span>
}

function FieldValue({
  field,
  userId,
}: {
  field: ProposalField
  userId: string
}) {
  const accounts = useAccounts(userId)

  switch (field.value.kind) {
    case "amount":
      return (
        <AssetAmount value={field.value.value} assetId={field.value.assetId} />
      )
    case "account": {
      const account = accounts.data?.byId[field.value.accountId]
      return (
        <span className="text-[12.5px] leading-[1.3] font-medium">
          {account?.name ?? field.value.accountId}
        </span>
      )
    }
    case "category":
      return (
        <span className="text-[12.5px] leading-[1.3] font-medium">
          <CategoryName categoryId={field.value.categoryId} userId={userId} />
        </span>
      )
    case "asset":
      return (
        <span className="text-[12.5px] leading-[1.3] font-medium">
          <AssetName assetId={field.value.assetId} />
        </span>
      )
    case "date":
      return (
        <span className="font-mono text-[12.5px] leading-[1.3] font-medium">
          {formatDateStamp(field.value.value, { year: "always" })}
        </span>
      )
    case "text":
      return (
        <span className="text-[12.5px] leading-[1.3] font-medium break-words">
          {field.value.text}
        </span>
      )
  }
}

export function ProposalReceipt({ proposal }: { proposal: ProposalPart }) {
  const denied = proposal.decision === "denied"
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-[10px] rounded-md border border-border px-[14px] py-[11px]",
        denied ? "bg-ghost-dim" : "bg-surface-2"
      )}
    >
      <MetaChip tone={denied ? "ghost" : "brand"}>
        {denied ? DENIED_LABEL : APPROVED_LABEL}
      </MetaChip>
      <span className="min-w-0 text-[12px] leading-[1.5] text-pretty text-ink-3">
        {denied
          ? DENIED_RECEIPT
          : `${toProposalView(proposal).title} — sent to your ledger.`}
      </span>
    </div>
  )
}

export function ApprovalCard({
  proposals,
  userId,
  busy,
  onRespond,
}: {
  proposals: readonly ProposalPart[]
  userId: string
  busy: boolean
  onRespond: (toolCallIds: readonly string[], approved: boolean) => void
}) {
  const [index, setIndex] = useState(0)
  const total = proposals.length
  const safeIndex = Math.min(index, Math.max(total - 1, 0))
  const proposal = proposals[safeIndex]
  if (proposal === undefined) return null

  const view = toProposalView(proposal)
  const allIds = proposals.map((candidate) => candidate.toolCallId)

  return (
    <section
      data-slot="myra-approval"
      data-testid="approval"
      className="min-w-0 overflow-hidden rounded-panel border-[1.5px] border-brand bg-surface"
    >
      <div className="flex items-center gap-[10px] border-b border-border bg-brand-dim px-4 py-[13px]">
        <CircleCheck className="size-[14px] flex-none text-brand" aria-hidden />
        <h3 className="text-[12.5px] leading-none font-bold tracking-[0.01em] text-brand">
          {APPROVAL_HEADLINE}
        </h3>
        {total > 1 ? (
          <span className="ms-auto flex items-center gap-[9px]">
            <button
              type="button"
              aria-label="Previous proposal"
              disabled={safeIndex === 0}
              onClick={() => {
                setIndex(safeIndex - 1)
              }}
              className={cn(
                "text-[12px] leading-none text-ink-3 disabled:opacity-40",
                focusRing.chip
              )}
            >
              ‹
            </button>
            <span className="font-mono text-[11px] leading-none whitespace-nowrap text-ink-2">
              {safeIndex + 1} / {total}
            </span>
            <button
              type="button"
              aria-label="Next proposal"
              disabled={safeIndex === total - 1}
              onClick={() => {
                setIndex(safeIndex + 1)
              }}
              className={cn(
                "text-[12px] leading-none text-ink-3 disabled:opacity-40",
                focusRing.chip
              )}
            >
              ›
            </button>
          </span>
        ) : null}
      </div>

      <div className="border-b border-border px-[18px] pt-[18px] pb-4">
        <p className="text-[12px] leading-[1.6] text-pretty text-ink-2">
          {APPROVAL_INTRO}
        </p>
        <div className="mt-[15px] flex flex-wrap items-center gap-[9px]">
          <span className="rounded-[4px] bg-brand-dim px-[7px] py-[5px] text-[10px] leading-none font-semibold tracking-[0.08em] text-brand uppercase">
            {view.typeLabel}
          </span>
          <span className="font-mono text-[11px] leading-none text-ink-3">
            {view.tool}
          </span>
        </div>
        <p className="mt-[13px] text-[17px] leading-[1.3] font-semibold tracking-[-0.015em]">
          {view.title}
        </p>
      </div>

      <div className="border-b border-border px-[18px] pt-[14px] pb-[15px]">
        <span className="text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
          What it will write
        </span>
        <dl className="mt-1">
          {[...view.fields, ...view.extras].map((field) => (
            <div
              key={field.key}
              className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border py-[10px] last:border-b-0"
            >
              <dt className="min-w-0 text-[11.5px] leading-[1.5] text-ink-3">
                <Truncate text={field.label} className="block" />
              </dt>
              <dd className="min-w-0 text-right">
                <FieldValue field={field} userId={userId} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-[11px] text-[11px] leading-[1.5] text-pretty text-ink-3">
          {APPROVAL_NET_EFFECT_REFUSAL}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-[9px] bg-surface-2 px-[18px] py-[14px]">
        <Button
          size="lg"
          disabled={busy}
          onClick={() => {
            onRespond([proposal.toolCallId], true)
          }}
        >
          {total > 1 ? `${APPROVE} this one` : APPROVE}
        </Button>
        {total > 1 ? (
          <Button
            size="lg"
            variant="outline"
            disabled={busy}
            onClick={() => {
              onRespond(allIds, true)
            }}
          >
            Approve all {total}
          </Button>
        ) : null}
        <Button
          size="lg"
          variant="ghost"
          disabled={busy}
          className="text-negative"
          onClick={() => {
            onRespond([proposal.toolCallId], false)
          }}
        >
          {DENY}
        </Button>
        <p className="ms-auto max-w-[230px] text-right text-[11px] leading-[1.5] text-pretty text-ink-3">
          {APPROVAL_FOOT}
        </p>
      </div>
    </section>
  )
}
