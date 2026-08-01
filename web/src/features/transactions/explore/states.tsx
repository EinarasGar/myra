import { AlignLeft, SearchX } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"

import { EmptyState } from "@/components/states/empty-state"
import { LoadingState, SkeletonBar } from "@/components/states/loading-state"
import { SNAP_A_RECEIPT } from "@/features/uploads"

import {
  FILTERED_EMPTY_BODY,
  LEDGER_EMPTY_BODY,
  LEDGER_EMPTY_FOOTNOTE,
  UNAPPLIED_ONLY_FOOTNOTE,
} from "./copy"

export function LedgerSkeleton() {
  return (
    <LoadingState label="Loading transactions">
      <SkeletonBar width={180} height={12} anchor />
      <div className="mt-2 flex flex-col gap-[10px]">
        {Array.from({ length: 8 }, (_, index) => (
          <SkeletonBar key={index} height={30} />
        ))}
      </div>
    </LoadingState>
  )
}

export function SlicePanelSkeleton() {
  return (
    <LoadingState className="mt-[14px]" label="Loading what is in this view">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-[9px]">
          <SkeletonBar width={92} height={9} />
          <SkeletonBar width={210} height={11} />
        </div>
        <div className="flex flex-col gap-[9px] sm:items-end">
          <SkeletonBar width={110} height={9} />
          <SkeletonBar width={140} height={17} anchor />
        </div>
      </div>
    </LoadingState>
  )
}

export function LedgerEmpty({
  onAdd,
  onConnect,
  hasUnappliedTokens = false,
}: {
  onAdd: () => void
  onConnect: () => void
  hasUnappliedTokens?: boolean
}) {
  const navigate = useNavigate()
  return (
    <EmptyState
      data-slot="ledger-empty"
      data-unapplied={hasUnappliedTokens}
      size="page"
      icon={<AlignLeft />}
      headline="Nothing in the ledger yet"
      body={LEDGER_EMPTY_BODY}
      actions={[
        { label: "Add a transaction", kind: "primary", onClick: onAdd },
        { label: "Connect a bank", onClick: onConnect },
        {
          label: SNAP_A_RECEIPT,
          onClick: () => {
            void navigate({
              to: "/transactions",
              search: { mode: "review", upload: "receipt" },
            })
          },
        },
      ]}
      footnote={
        hasUnappliedTokens ? UNAPPLIED_ONLY_FOOTNOTE : LEDGER_EMPTY_FOOTNOTE
      }
    />
  )
}

export function LedgerFilteredEmpty({
  onClear,
  footnote,
}: {
  onClear: () => void
  footnote: string
}) {
  return (
    <EmptyState
      data-slot="ledger-filtered-empty"
      size="page"
      icon={<SearchX />}
      headline="No transactions match this filter"
      body={FILTERED_EMPTY_BODY}
      actions={[{ label: "Clear filters", kind: "primary", onClick: onClear }]}
      footnote={footnote}
    />
  )
}
