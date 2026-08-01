import { useEffect, useId, useMemo, useRef, useState } from "react"

import { useShellWidth } from "@/components/layout/breakpoints"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { focusRing, HIT_TARGET } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { getErrorMessage, normalizeError } from "@/lib/errors"
import type { UserId } from "@/lib/query"
import { cn } from "@/lib/utils"

import type { LedgerGroupRow } from "../api"
import { useUpdateTransactionGroup } from "../api"

import { formatEditorDate } from "./date-input"
import type { EditorPanelParts } from "./editor-panel"
import { TextField } from "./fields"
import { firstControl, firstInvalidControl } from "./focus"
import {
  CANCEL,
  DATE_HINT,
  DATE_LABEL,
  DATE_PLACEHOLDER,
  DESCRIPTION_HINT,
  DESCRIPTION_LABEL,
  DESCRIPTION_PLACEHOLDER,
  GROUP_EDITOR_EYEBROW,
  GROUP_EDITOR_INTRO,
  GROUP_EDITOR_MEMBERS_LABEL,
  GROUP_EDITOR_TITLE,
  GROUP_UNSAVED_BODY,
  GROUP_UNSAVED_DISCARD,
  GROUP_UNSAVED_KEEP,
  GROUP_UNSAVED_TITLE,
  groupMembersHeldNote,
  groupRejectedSummary,
  SAVE_GROUP,
  SAVING_GROUP,
} from "./group-copy"
import type { GroupEditorDraft } from "./group-draft"
import {
  editedGroup,
  groupEditorDraft,
  groupEditorErrors,
  isGroupEditorDraftDirty,
  withGroupDate,
} from "./group-draft"
import {
  GroupCategoryField,
  GroupCategoryFieldSkeleton,
  GroupMemberLine,
} from "./group-parts"
import {
  groupUpdatedToast,
  groupUpdateUndoFailedToast,
  groupUpdateUndoneToast,
} from "./group-toasts"
import { EDITOR_SHEET_WIDTH } from "./layout"
import { serverErrors } from "./validation"

const CHILD_ERROR_NOTE =
  "Saving a group re-checks every transaction inside it, and Sverto names the first field it refuses without saying which transaction it belongs to. Nothing here edits those transactions, so this is about data they already carried."

const KNOWN_FIELDS = new Set(["description", "date", "category_id"])

export interface GroupEditorProps {
  userId: UserId
  group: LedgerGroupRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (group: LedgerGroupRow) => void
  onOpenChild?: (transactionId: string) => void
  now?: Date
  resetKey?: string
}

export function useGroupEditorPanel({
  userId,
  group,
  open,
  onOpenChange,
  onSaved,
  onOpenChild,
  now,
  resetKey,
}: GroupEditorProps): EditorPanelParts {
  const width = useShellWidth()
  const shellWidth = EDITOR_SHEET_WIDTH[width] || undefined
  const clock = useMemo(() => now ?? new Date(), [now])
  const formId = useId()
  const formRef = useRef<HTMLFormElement | null>(null)

  const seedKey = `${String(resetKey)}:${group?.groupId ?? "none"}:${String(open)}`
  const [instance, setInstance] = useState(seedKey)
  const [draft, setDraft] = useState<GroupEditorDraft>(() =>
    group === null
      ? { description: "", dateText: "", date: null, categoryId: null }
      : groupEditorDraft(group)
  )
  const [submitted, setSubmitted] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const [rejections, setRejections] = useState(0)
  const [staleServerError, setStaleServerError] = useState(false)

  const update = useUpdateTransactionGroup(userId)

  if (seedKey !== instance) {
    setInstance(seedKey)
    setDraft(
      group === null
        ? { description: "", dateText: "", date: null, categoryId: null }
        : groupEditorDraft(group)
    )
    setSubmitted(false)
    setConfirmingDiscard(false)
    setRejections(0)
    setStaleServerError(true)
  }

  const errors = groupEditorErrors(draft)
  const shown = submitted ? errors : {}
  const dirty = group !== null && isGroupEditorDraftDirty(group, draft)

  const server = useMemo(
    () => serverErrors(staleServerError ? null : update.error),
    [staleServerError, update.error]
  )

  const banner = useMemo(() => {
    const orphans = Object.entries(server.fieldErrors)
      .filter(([field]) => !KNOWN_FIELDS.has(field))
      .flatMap(([, messages]) => messages)
    const messages = [...server.formErrors, ...orphans]
    if (messages.length === 0) return null
    return orphans.length === 0
      ? messages.join(" ")
      : `${messages.join(" ")} ${CHILD_ERROR_NOTE}`
  }, [server])

  const summary =
    submitted && Object.keys(errors).length > 0
      ? groupRejectedSummary(Object.keys(errors).length)
      : null

  const closeSheet = () => {
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

  const submit = () => {
    setSubmitted(true)
    setStaleServerError(false)
    if (group === null) return
    const next = editedGroup(group, draft)
    if (next === null) {
      setRejections((count) => count + 1)
      return
    }

    update.mutate(
      { group: next },
      {
        onSuccess: () => {
          groupUpdatedToast({
            description: next.description,
            onUndo: () => {
              update.mutate(
                { group: group.raw },
                {
                  onSuccess: () => {
                    groupUpdateUndoneToast(group.raw.description)
                  },
                  onError: (error) => {
                    groupUpdateUndoFailedToast(
                      getErrorMessage(normalizeError(error))
                    )
                  },
                }
              )
            },
          })
          onSaved?.(group)
          closeSheet()
        },
      }
    )
  }

  /**
   * The invalid controls only carry `aria-invalid` after the render the rejection triggers,
   * so the first thing to fix is put under the cursor from an effect rather than from submit.
   */
  useEffect(() => {
    if (rejections === 0) return
    const target = firstInvalidControl(formRef.current)
    if (target === null) return
    target.focus()
    target.scrollIntoView?.({ block: "center" })
  }, [rejections])

  const parsedLabel = draft.date === null ? null : formatEditorDate(draft.date)
  const children = group?.children ?? []

  return {
    eyebrow: GROUP_EDITOR_EYEBROW,
    title: GROUP_EDITOR_TITLE,
    width: shellWidth,
    requestClose,
    initialFocus: () => firstControl(formRef.current),
    headerActions: (
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
    ),
    footer: confirmingDiscard ? (
      <>
        <span className="flex-1 text-[11.5px] leading-[1.4] text-pretty text-ink-2">
          <strong className="font-semibold text-ink">
            {GROUP_UNSAVED_TITLE}
          </strong>{" "}
          {GROUP_UNSAVED_BODY}
        </span>
        <Button
          variant="outline"
          onClick={closeSheet}
          className="h-auto rounded-button border-negative px-[14px] py-[9px] text-[12px] leading-none font-semibold text-negative"
        >
          {GROUP_UNSAVED_DISCARD}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setConfirmingDiscard(false)
          }}
          className="h-auto rounded-sm px-3 py-[9px] text-[12.5px] leading-none font-semibold text-ink-2"
        >
          {GROUP_UNSAVED_KEEP}
        </Button>
      </>
    ) : (
      <>
        <Button
          type="submit"
          form={formId}
          disabled={update.isPending || group === null}
          className={cn(
            "h-auto font-semibold",
            width === "phone"
              ? "flex-1 rounded-md py-[13px] text-[13px] leading-none"
              : "rounded-button px-[15px] py-[9px] text-[12.5px] leading-none"
          )}
        >
          {update.isPending ? SAVING_GROUP : SAVE_GROUP}
        </Button>
        <span className="flex-1" />
        <Button
          variant="ghost"
          onClick={requestClose}
          className="h-auto rounded-sm px-3 py-[9px] text-[12.5px] leading-none font-semibold text-ink-2"
        >
          {CANCEL}
        </Button>
      </>
    ),
    body: (
      <div data-slot="group-editor-body" className="flex flex-col">
        <form
          id={formId}
          ref={formRef}
          noValidate
          data-slot="group-editor-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (confirmingDiscard) return
            submit()
          }}
          className="flex flex-col gap-4 px-4 pt-4 pb-5 sm:px-6 sm:pt-5"
        >
          {banner === null && summary === null ? null : (
            <div
              data-slot="group-editor-form-error"
              role="alert"
              className="rounded-md border border-negative px-[13px] py-[11px] text-[12px] leading-[1.6] text-pretty text-ink-2"
            >
              {[summary, banner].filter((part) => part !== null).join(" ")}
            </div>
          )}

          <p
            data-slot="group-editor-intro"
            className="rounded-md bg-brand-dim px-[13px] py-[11px] text-[11.5px] leading-[1.5] text-pretty text-ink-2"
          >
            {GROUP_EDITOR_INTRO}
          </p>

          <TextField
            label={DESCRIPTION_LABEL}
            hint={DESCRIPTION_HINT}
            placeholder={DESCRIPTION_PLACEHOLDER}
            value={draft.description}
            errors={shown.description === undefined ? [] : [shown.description]}
            onChange={(description) => {
              setDraft((previous) => ({ ...previous, description }))
            }}
          />

          <TextField
            label={DATE_LABEL}
            placeholder={DATE_PLACEHOLDER}
            value={draft.dateText}
            hint={DATE_HINT}
            {...(parsedLabel === null ? {} : { labelHint: parsedLabel })}
            errors={shown.date === undefined ? [] : [shown.date]}
            onChange={(dateText) => {
              setDraft((previous) => withGroupDate(previous, dateText, clock))
            }}
          />

          <PanelBoundary pending={<GroupCategoryFieldSkeleton />}>
            <GroupCategoryField
              userId={userId}
              value={draft.categoryId}
              errors={shown.category === undefined ? [] : [shown.category]}
              onChange={(categoryId) => {
                setDraft((previous) => ({ ...previous, categoryId }))
              }}
            />
          </PanelBoundary>
        </form>

        <section
          data-slot="group-editor-members"
          className="border-t border-border px-4 pt-4 pb-5 sm:px-6"
        >
          <p className="text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
            {GROUP_EDITOR_MEMBERS_LABEL}
          </p>
          <ul className="mt-2">
            {children.map((child) => (
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
              />
            ))}
          </ul>
          <p
            data-slot="group-editor-members-note"
            className="mt-3 text-[11px] leading-[1.5] text-pretty text-ink-3"
          >
            {groupMembersHeldNote(children.length)}
          </p>
        </section>
      </div>
    ),
  }
}

export const GROUP_EDITOR_SHEET_CLASS =
  "[&_[data-slot=adaptive-sheet-body]]:p-0"
