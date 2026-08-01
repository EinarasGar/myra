import type { ReactNode } from "react"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"

import type { RequiredIdentifiableTransaction } from "@/api"
import type { AssetRef } from "@/lib/domain/refs"
import type { TransactionTypeTag } from "@/lib/domain/transaction-types"
import {
  TRANSACTION_TYPE_CONFIG,
  transactionTypeName,
} from "@/lib/domain/transaction-types"
import type { TransactionId, UserId } from "@/lib/query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useShellWidth } from "@/components/layout/breakpoints"
import { ErrorStateFor } from "@/components/layout/error-states"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { focusRing, HIT_TARGET } from "@/components/primitives"
import {
  EditorFormWithReferences,
  FocusFirstControl,
  FormSkeleton,
  TypeChip,
} from "./editor-parts"

import {
  resolveAsset,
  useDeleteTransaction,
  useTransactionDetail,
} from "../api"
import { useCreateTransaction, useUpdateTransaction } from "./api/mutations"
import { buildUpdatePayload, candidateFieldNames } from "./candidate"
import {
  CANCEL,
  CHANGE_TYPE,
  CHOOSER_EYEBROW,
  CHOOSER_FOOTER,
  CHOOSER_TITLE,
  PROPOSAL_EYEBROW,
  SAVE_AND_NEW,
  SAVE_CREATE,
  SAVE_EDIT,
  SAVING,
  UNSAVED_BODY,
  UNSAVED_DISCARD,
  UNSAVED_KEEP,
  UNSAVED_TITLE,
  unsavedFieldSummary,
  UPDATE_UNDO_UNAVAILABLE,
} from "./copy"
import { formatEditorDate, parseEditorDate } from "./date-input"
import { firstControl, firstInvalidControl } from "./focus"
import type { EditorDraft } from "./draft"
import {
  clearedForNext,
  draftFromTransaction,
  emptyDraft,
  withType,
} from "./draft"
import { EDITOR_SHEET_WIDTH, editorTypeView } from "./layout"
import type { EditorProposal } from "./proposal"
import { editorProposal } from "./proposal"
import { createdToast, updatedToast, undoneCreateToast } from "./toasts"
import { TypeChooser } from "./type-chooser"
import {
  mergeFieldErrors,
  orphanServerErrors,
  serverErrors,
  validateDraft,
  type EditorFieldErrors,
} from "./validation"

export type EditorMode =
  | { readonly kind: "create"; readonly type?: TransactionTypeTag }
  | { readonly kind: "edit"; readonly transactionId: TransactionId }
  | { readonly kind: "proposal" }

function seedDate(now: Date): { date: number; dateText: string } {
  const parsed = parseEditorDate("today", now)
  const date = parsed.date ?? Math.floor(now.getTime() / 1000)
  return { date, dateText: formatEditorDate(date) }
}

export interface TransactionEditorProps {
  userId: UserId
  mode: EditorMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (mode: EditorMode) => void
  now?: Date
  /**
   * A draft belongs to the thing it was opened on. When the editor shares a sheet with the
   * detail panel it cannot be remounted per open, so a changed key clears the draft instead.
   */
  resetKey?: string
}

export interface EditorPanelParts {
  readonly eyebrow: ReactNode
  readonly title: ReactNode
  readonly width: number | undefined
  readonly headerActions: ReactNode
  readonly footer: ReactNode
  readonly body: ReactNode
  readonly requestClose: () => void
  readonly initialFocus: () => HTMLElement | null
}

export function useEditorPanel({
  userId,
  mode,
  open,
  onOpenChange,
  onSaved,
  now,
  resetKey,
}: TransactionEditorProps): EditorPanelParts {
  const width = useShellWidth()
  const clock = useMemo(() => now ?? new Date(), [now])
  const seed = useMemo(() => seedDate(clock), [clock])

  const [proposal, setProposal] = useState<EditorProposal | null>(null)
  const [draft, setDraftState] = useState<EditorDraft>(() =>
    emptyDraft({
      ...seed,
      ...(mode.kind === "create" && mode.type !== undefined
        ? { type: mode.type }
        : {}),
    })
  )
  const [dirty, setDirty] = useState(false)
  const [choosing, setChoosing] = useState(mode.kind === "create")
  const [submitted, setSubmitted] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const [knownAssets, setKnownAssets] = useState<readonly AssetRef[]>([])
  const [rejections, setRejections] = useState(0)
  const seededFor = useRef<string | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const formId = useId()
  const [instance, setInstance] = useState(resetKey)
  const [staleServerError, setStaleServerError] = useState(false)

  const isEdit = mode.kind === "edit"
  const detail = useTransactionDetail({
    userId,
    transactionId: isEdit ? mode.transactionId : "",
    enabled: open && isEdit,
  })

  const createTransaction = useCreateTransaction(userId)
  const updateTransaction = useUpdateTransaction(userId)
  const removeCreated = useDeleteTransaction(userId)

  if (resetKey !== instance) {
    setInstance(resetKey)
    setStaleServerError(true)
    setProposal(null)
    setDraftState(
      emptyDraft({
        ...seed,
        ...(mode.kind === "create" && mode.type !== undefined
          ? { type: mode.type }
          : {}),
      })
    )
    setDirty(false)
    setChoosing(mode.kind === "create")
    setSubmitted(false)
    setConfirmingDiscard(false)
    setRejections(0)
  }

  const setDraft = useCallback((next: EditorDraft) => {
    setDirty(true)
    setDraftState((previous) => {
      if (next.dateText === previous.dateText) return next
      const parsed = parseEditorDate(next.dateText, new Date())
      return { ...next, date: parsed.date }
    })
  }, [])

  useEffect(() => {
    if (!open || mode.kind !== "proposal") return
    const key = `${String(resetKey)}:proposal`
    if (seededFor.current === key) return
    seededFor.current = key
    const next = editorProposal({
      ...seed,
      accountId: null,
      assetId: null,
      categoryId: null,
    })
    setProposal(next)
    setDraftState(next.draft)
    setChoosing(false)
  }, [open, mode.kind, seed, resetKey])

  useEffect(() => {
    if (!open || !isEdit) return
    const loaded = detail.detail
    const raw = loaded?.raw.transaction
    if (loaded === undefined || raw === undefined) return
    const key = `${String(resetKey)}:edit:${mode.transactionId}`
    if (seededFor.current === key) return
    seededFor.current = key
    const transaction = {
      ...raw,
      transaction_id: mode.transactionId,
    } as RequiredIdentifiableTransaction
    setDraftState(
      draftFromTransaction(transaction, formatEditorDate(transaction.date))
    )
    setKnownAssets([...loaded.lookup.assets.values()])
    setChoosing(false)
    setDirty(false)
  }, [open, isEdit, detail.detail, mode, resetKey])

  const shortcuts = useRef<{ save: () => void; changeType: () => void }>({
    save: () => {},
    changeType: () => {},
  })

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key === "Enter") {
        event.preventDefault()
        shortcuts.current.save()
      }
      if (event.key === "t" || event.key === "T") {
        event.preventDefault()
        shortcuts.current.changeType()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const view = useMemo(
    () => (draft.type === null ? null : editorTypeView(draft.type)),
    [draft.type]
  )

  const validation = useMemo(
    () => (view === null ? null : validateDraft(view, draft)),
    [view, draft]
  )

  const mutation = isEdit ? updateTransaction : createTransaction

  /**
   * The mutation outlives an open when the editor shares a sheet, so a rejection from the
   * previous transaction would otherwise greet the next one.
   */
  const server = useMemo(
    () => serverErrors(staleServerError ? null : mutation.error),
    [staleServerError, mutation.error]
  )

  const rendered = useMemo(
    () => ({
      roots: view === null ? [] : candidateFieldNames(view.type),
      feeCount: draft.fees.length,
    }),
    [view, draft.fees.length]
  )

  const orphans = useMemo(
    () => orphanServerErrors(server.fieldErrors, rendered),
    [server, rendered]
  )

  const formErrors = useMemo(
    () => [...server.formErrors, ...orphans.messages],
    [server, orphans]
  )

  const errors: EditorFieldErrors = useMemo(() => {
    const client = submitted ? (validation?.fieldErrors ?? {}) : {}
    return mergeFieldErrors(client, orphans.fieldErrors)
  }, [submitted, validation, orphans])

  const summary =
    submitted && validation !== null && !validation.ok
      ? unsavedFieldSummary(Object.keys(validation.fieldErrors).length)
      : null

  const lookupAsset = useCallback(
    (assetId: number | null): AssetRef | null => {
      if (assetId === null) return null
      const known = knownAssets.find((asset) => asset.assetId === assetId)
      if (known !== undefined) return known
      if (detail.detail !== undefined) {
        return resolveAsset(detail.detail.lookup, assetId)
      }
      return null
    },
    [knownAssets, detail.detail]
  )

  const closeSheet = () => {
    seededFor.current = null
    setSubmitted(false)
    setConfirmingDiscard(false)
    onOpenChange(false)
  }

  const requestClose = () => {
    if (dirty && !confirmingDiscard) {
      setConfirmingDiscard(true)
      return
    }
    closeSheet()
  }

  const submit = (addAnother = false) => {
    setSubmitted(true)
    setStaleServerError(false)
    if (view === null || validation === null || !validation.ok) {
      setRejections((count) => count + 1)
      return
    }
    if (validation.value === null) {
      setRejections((count) => count + 1)
      return
    }

    if (isEdit) {
      updateTransaction.mutate(
        {
          transactionId: mode.transactionId,
          transaction: buildUpdatePayload(view.type, draft),
        },
        {
          onSuccess: () => {
            updatedToast()
            onSaved?.(mode)
            closeSheet()
          },
        }
      )
      return
    }

    createTransaction.mutate(
      { transaction: validation.value },
      {
        onSuccess: (response) => {
          const createdId = response.transaction.transaction_id
          createdToast({
            typeName: transactionTypeName(view.type),
            onUndo: () => {
              removeCreated.mutate(
                { transactionId: createdId },
                { onSuccess: undoneCreateToast }
              )
            },
          })
          onSaved?.(mode)
          if (!addAnother) {
            closeSheet()
            return
          }
          setDraftState(clearedForNext(draft))
          setSubmitted(false)
          setDirty(false)
        },
      }
    )
  }

  useEffect(() => {
    shortcuts.current = {
      save: () => {
        submit()
      },
      changeType: () => {
        setChoosing(true)
      },
    }
  })

  /**
   * A rejected save leaves the sheet exactly as it was, so the first thing that has to be
   * fixed is put under the cursor and scrolled to rather than left below the fold.
   */
  useEffect(() => {
    if (rejections === 0) return
    const target = firstInvalidControl(formRef.current)
    if (target === null) return
    target.focus()
    target.scrollIntoView?.({ block: "center" })
  }, [rejections])

  const title =
    mode.kind === "create" && choosing
      ? CHOOSER_TITLE
      : view === null
        ? CHOOSER_TITLE
        : TRANSACTION_TYPE_CONFIG[view.type].name

  const eyebrow = mode.kind === "proposal" ? PROPOSAL_EYEBROW : CHOOSER_EYEBROW
  const showsKeyHints = width === "full" || width === "tight"

  return {
    eyebrow,
    title,
    width: EDITOR_SHEET_WIDTH[width] || undefined,
    requestClose,
    headerActions: (
      <>
        {view === null ? null : <TypeChip type={view.type} />}
        {view === null || choosing ? null : (
          <button
            type="button"
            onClick={() => {
              setChoosing(true)
            }}
            className={cn(
              "flex items-center gap-[6px] text-[11px] leading-none font-medium text-ink-3 outline-none",
              focusRing.chip
            )}
          >
            {CHANGE_TYPE}
            {showsKeyHints ? (
              <span className="rounded-chip border border-border px-1 py-[3px] font-mono text-[10px] leading-none font-medium">
                ⌘T
              </span>
            ) : null}
          </button>
        )}
        <button
          type="button"
          aria-label="Close"
          onClick={requestClose}
          className={cn(
            "text-[14px] leading-none text-ink-3 outline-none",
            HIT_TARGET,
            focusRing.chip
          )}
        >
          ✕
        </button>
      </>
    ),
    footer: confirmingDiscard ? (
      <>
        <span className="flex-1 text-[11.5px] leading-[1.4] text-pretty text-ink-2">
          <strong className="font-semibold text-ink">{UNSAVED_TITLE}</strong>{" "}
          {UNSAVED_BODY}
        </span>
        <Button
          variant="outline"
          onClick={closeSheet}
          className="h-auto rounded-button border-negative px-[14px] py-[9px] text-[12px] leading-none font-semibold text-negative"
        >
          {UNSAVED_DISCARD}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setConfirmingDiscard(false)
          }}
          className="h-auto rounded-sm px-3 py-[9px] text-[12.5px] leading-none font-semibold text-ink-2"
        >
          {UNSAVED_KEEP}
        </Button>
      </>
    ) : choosing || view === null ? (
      <span className="text-[11.5px] leading-[1.5] text-ink-3">
        {CHOOSER_FOOTER}
      </span>
    ) : (
      <>
        <Button
          type="submit"
          form={formId}
          disabled={mutation.isPending}
          className={cn(
            "h-auto font-semibold",
            width === "phone"
              ? "flex-1 rounded-md py-[13px] text-[13px] leading-none"
              : "rounded-button px-[15px] py-[9px] text-[12.5px] leading-none"
          )}
        >
          {mutation.isPending ? SAVING : isEdit ? SAVE_EDIT : SAVE_CREATE}
          {showsKeyHints ? (
            <span className="ml-2 font-mono text-[10px] leading-none font-semibold opacity-[0.72]">
              ⌘⏎
            </span>
          ) : null}
        </Button>
        {isEdit || width === "phone" ? null : (
          <Button
            variant="outline"
            onClick={() => {
              submit(true)
            }}
            disabled={mutation.isPending}
            className="h-auto rounded-button px-[14px] py-[9px] text-[12.5px] leading-none font-semibold"
          >
            {SAVE_AND_NEW}
          </Button>
        )}
        <span className="flex-1" />
        {isEdit ? (
          <span className="hidden text-[11.5px] leading-none text-ink-3 lg:inline">
            {UPDATE_UNDO_UNAVAILABLE}
          </span>
        ) : null}
        <Button
          variant="ghost"
          onClick={requestClose}
          className="h-auto rounded-sm px-3 py-[9px] text-[12.5px] leading-none font-semibold text-ink-2"
        >
          {CANCEL}
        </Button>
      </>
    ),
    initialFocus: () => firstControl(formRef.current),
    body: (
      <div data-slot="editor-body" className="flex items-stretch">
        <form
          id={formId}
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (choosing || confirmingDiscard) return
            submit()
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.defaultPrevented) return
            if (event.metaKey || event.ctrlKey) return
            if (event.nativeEvent.isComposing) return
            if (!(event.target instanceof HTMLInputElement)) return
            event.preventDefault()
            if (choosing || confirmingDiscard || mutation.isPending) return
            submit()
          }}
          data-slot="editor-column"
          className={cn(
            "min-w-0 flex-1 px-4 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-6"
          )}
        >
          {formErrors.length === 0 && summary === null ? null : (
            <div
              data-slot="editor-form-error"
              role="alert"
              className="mb-4 rounded-md border border-negative px-[13px] py-[11px] text-[12px] leading-[1.6] text-pretty text-ink-2"
            >
              {[summary, ...formErrors].filter(Boolean).join(" ")}
            </div>
          )}

          {choosing ? (
            <>
              <FocusFirstControl key="chooser" scope={formRef} />
              <TypeChooser
                selected={draft.type}
                showsKeyHints={showsKeyHints}
                onSelect={(type) => {
                  setDraftState((previous) => withType(previous, type))
                  setDirty(true)
                  setChoosing(false)
                }}
              />
            </>
          ) : isEdit && detail.detail === undefined ? (
            detail.isError ? (
              <ErrorStateFor error={detail.error} onRetry={detail.refetch} />
            ) : (
              <FormSkeleton />
            )
          ) : view === null ? null : (
            <div className="flex flex-col gap-4">
              {proposal === null ? null : (
                <p
                  data-slot="proposal-intro"
                  className="flex items-start gap-[9px] rounded-md bg-brand-dim px-[13px] py-[11px] text-[11.5px] leading-[1.5] text-pretty text-ink-2"
                >
                  {proposal.intro}
                </p>
              )}

              <PanelBoundary pending={<FormSkeleton />}>
                <FocusFirstControl key={view.type} scope={formRef} />
                <EditorFormWithReferences
                  userId={userId}
                  view={view}
                  draft={draft}
                  onDraft={setDraft}
                  errors={errors}
                  knownAssets={knownAssets}
                  proposal={proposal}
                  lookupAsset={lookupAsset}
                  onAssetResolved={(asset) => {
                    setKnownAssets((previous) =>
                      previous.some((known) => known.assetId === asset.assetId)
                        ? previous
                        : [...previous, asset]
                    )
                  }}
                />
              </PanelBoundary>
            </div>
          )}
        </form>
      </div>
    ),
  }
}

export const EDITOR_SHEET_CLASS = "[&_[data-slot=adaptive-sheet-body]]:p-0"
