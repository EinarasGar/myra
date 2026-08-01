import { useCallback, useEffect, useMemo } from "react"
import type { RefObject } from "react"

import type { AssetRef } from "@/lib/domain/refs"
import { assetLabel } from "@/lib/domain/refs"
import type { TransactionTypeTag } from "@/lib/domain/transaction-types"
import { transactionTypeName } from "@/lib/domain/transaction-types"
import type { UserId } from "@/lib/query"
import { SkeletonBar } from "@/components/states/loading-state"

import { CorrectionChat } from "./correction-chat"
import { LOADING_TRANSACTION } from "./copy"
import { firstControl } from "./focus"
import { formatEditorDate } from "./date-input"
import type { EditorDraft } from "./draft"
import { EditorForm } from "./editor-form"
import type { editorTypeView } from "./layout"
import type { EditorProposal } from "./proposal"
import { NO_PROVENANCE, provenanceFor, provenanceValues } from "./proposal"
import { useEditorReferences } from "./references"
import type { EditorFieldErrors } from "./validation"

export function FormSkeleton() {
  return (
    <div role="status" aria-busy className="flex flex-col gap-4">
      <span className="sr-only">{LOADING_TRANSACTION}</span>
      <SkeletonBar width={120} height={10} />
      <SkeletonBar width="100%" height={48} anchor />
      <SkeletonBar width="100%" height={40} />
      <SkeletonBar width="100%" height={40} />
      <SkeletonBar width="60%" height={40} />
    </div>
  )
}

/**
 * Mounted with the fields themselves, so the cursor arrives when the form does rather than
 * while it is still a skeleton waiting on its accounts and categories.
 */
export function FocusFirstControl({
  scope,
}: {
  scope: RefObject<HTMLFormElement | null>
}) {
  useEffect(() => {
    const form = scope.current
    if (form === null || form.contains(document.activeElement)) return
    firstControl(form)?.focus()
  }, [scope])
  return null
}

export function TypeChip({ type }: { type: TransactionTypeTag }) {
  return (
    <span
      data-slot="editor-type-chip"
      className="rounded-sm bg-brand-dim px-2 py-[6px] text-[10px] leading-none font-semibold tracking-[0.07em] text-brand uppercase"
    >
      {transactionTypeName(type)}
    </span>
  )
}

export function EditorFormWithReferences({
  userId,
  view,
  draft,
  onDraft,
  errors,
  knownAssets,
  proposal,
  lookupAsset,
  onAssetResolved,
}: {
  userId: UserId
  view: ReturnType<typeof editorTypeView>
  draft: EditorDraft
  onDraft: (draft: EditorDraft) => void
  errors: EditorFieldErrors
  knownAssets: readonly AssetRef[]
  proposal: EditorProposal | null
  lookupAsset: (assetId: number | null) => AssetRef | null
  onAssetResolved: (asset: AssetRef) => void
}) {
  const references = useEditorReferences(userId)

  const assetName = useCallback(
    (assetId: number | null): string => {
      if (assetId === null) return "—"
      const known = lookupAsset(assetId) ?? references.currencyById[assetId]
      return known === undefined || known === null
        ? `Asset ${String(assetId)}`
        : assetLabel(known)
    },
    [lookupAsset, references]
  )

  const context = useMemo(
    () => ({
      slotField: (key: "primary" | "counter") =>
        view.slots.find((slot) => slot.key === key)?.shape.field ?? null,
      accountName: references.accountName,
      categoryName: references.categoryName,
      dateLabel: (date: number | null) =>
        date === null ? null : formatEditorDate(date),
    }),
    [view, references]
  )

  const provenance = useMemo(
    () =>
      proposal === null
        ? NO_PROVENANCE
        : provenanceFor({
            proposal,
            values: provenanceValues(draft, context),
            proposedValues: provenanceValues(proposal.draft, context),
          }),
    [proposal, draft, context]
  )

  return (
    <div className="flex flex-col gap-4">
      <EditorForm
        view={view}
        draft={draft}
        onDraft={onDraft}
        errors={errors}
        references={references}
        knownAssets={knownAssets}
        onAssetResolved={onAssetResolved}
        provenance={provenance}
        assetName={assetName}
        lookupAsset={lookupAsset}
      />

      {proposal === null ? null : (
        <CorrectionChat
          proposal={proposal}
          correctedCount={provenance.correctedCount}
        />
      )}
    </div>
  )
}
