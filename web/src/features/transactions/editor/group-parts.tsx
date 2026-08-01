import type { ReactNode } from "react"

import { Figure } from "@/components/figure"
import { focusRing, Truncate } from "@/components/primitives"
import { SkeletonBar } from "@/components/states/loading-state"
import { accountLabel } from "@/lib/domain/refs"
import { formatDateStamp } from "@/lib/format"
import type { UserId } from "@/lib/query"
import { cn } from "@/lib/utils"

import type { LedgerTransactionRow } from "../api"
import { nativeFigureProps } from "../api"

import { SelectField } from "./fields"
import {
  CATEGORY_HINT,
  CATEGORY_LABEL,
  CATEGORY_PLACEHOLDER,
} from "./group-copy"
import { useEditorReferences } from "./references"

export function GroupCategoryFieldSkeleton() {
  return (
    <div className="flex flex-col gap-2" role="status" aria-busy>
      <span className="sr-only">Loading your categories</span>
      <SkeletonBar height={9} width={72} />
      <SkeletonBar height={40} />
    </div>
  )
}

export function GroupCategoryField({
  userId,
  value,
  onChange,
  errors,
}: {
  userId: UserId
  value: number | null
  onChange: (categoryId: number | null) => void
  errors: readonly string[]
}) {
  const references = useEditorReferences(userId)

  return (
    <SelectField
      label={CATEGORY_LABEL}
      hint={CATEGORY_HINT}
      placeholder={CATEGORY_PLACEHOLDER}
      value={value === null ? "" : String(value)}
      options={references.categoryOptions}
      errors={errors}
      onChange={(next) => {
        onChange(next === "" ? null : Number(next))
      }}
    />
  )
}

function memberMeta(row: LedgerTransactionRow): string {
  return [
    formatDateStamp(row.date, { year: "always" }),
    row.account === null ? null : accountLabel(row.account),
    row.typeName,
  ]
    .filter((part) => part !== null && part !== "")
    .join(" · ")
}

export function GroupMemberLine({
  row,
  onOpen,
  action,
}: {
  row: LedgerTransactionRow
  onOpen?: () => void
  action?: ReactNode
}) {
  const label = (
    <>
      <Truncate
        text={row.description.primary}
        className="block text-[12.5px] leading-[1.3] font-medium"
      />
      <Truncate
        text={memberMeta(row)}
        className="block font-mono text-[11px] leading-[1.4] text-ink-3"
      />
    </>
  )

  return (
    <li
      data-slot="group-member-line"
      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-[10px]"
    >
      {onOpen === undefined ? (
        <span className="min-w-0">{label}</span>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${row.description.primary}`}
          className={cn(
            "min-w-0 rounded-sm text-left outline-none",
            focusRing.chip
          )}
        >
          {label}
        </button>
      )}
      {row.primaryAmount === null ? (
        <Figure value={null} emptyLabel="No entries" />
      ) : (
        <Figure
          {...nativeFigureProps(row.primaryAmount)}
          intent={row.figureIntent}
          className="text-right"
        />
      )}
      {action === undefined ? <span aria-hidden className="w-0" /> : action}
    </li>
  )
}
