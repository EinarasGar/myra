import { useId, useMemo, useState } from "react"
import { XIcon } from "lucide-react"

import { Figure } from "@/components/figure"
import { AdaptiveSheet } from "@/components/layout/adaptive-sheet"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { focusRing, Truncate } from "@/components/primitives"
import { SkeletonBar } from "@/components/states/loading-state"
import { Button } from "@/components/ui/button"
import { useCategoryCatalogue } from "@/features/categories/api"
import { accountLabel } from "@/lib/domain/refs"
import { formatDateStamp } from "@/lib/format"
import type { UserId } from "@/lib/query"
import { cn } from "@/lib/utils"

import type { LedgerTransactionRow } from "../api"
import { nativeFigureProps } from "../api"
import { formatEditorDate, parseEditorDate } from "../editor"
import type { FieldOption } from "../editor/fields"
import { SelectField, TextField } from "../editor/fields"

import {
  ADD_INTRO,
  ADD_TITLE,
  CANCEL,
  CATEGORY_HINT,
  CATEGORY_LABEL,
  CATEGORY_PLACEHOLDER,
  CREATE_INTRO,
  CREATE_TITLE,
  DATE_HINT,
  DATE_LABEL,
  DATE_PLACEHOLDER,
  DESCRIPTION_HINT,
  DESCRIPTION_LABEL,
  DESCRIPTION_PLACEHOLDER,
  existingMembersNote,
  GROUP_EYEBROW,
  MEMBER_PICKER_EMPTY,
  MEMBER_PICKER_HINT,
  MEMBER_PICKER_PLACEHOLDER,
  MEMBERS_EMPTY,
  MEMBERS_LABEL,
  membersNote,
  REMOVE_MEMBER,
  SAVE_ADD,
  SAVE_CREATE,
  SAVING,
} from "./copy"
import type { GroupDraft } from "./members"
import {
  groupDraftErrors,
  resolveGroupDraft,
  seedAddDraft,
  seedGroupDraft,
  withMember,
  withoutMember,
} from "./members"
import { useUngroupedSearch } from "./api"
import type { GroupActions } from "./use-group-actions"
import type { GroupComposerTarget } from "./use-group-composer"

const GROUP_COMPOSER_SHEET_CLASS = "[&_[data-slot=adaptive-sheet-body]]:p-0"

function MemberRow({
  row,
  onRemove,
}: {
  row: LedgerTransactionRow
  onRemove?: () => void
}) {
  return (
    <li
      data-slot="group-member"
      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-[10px]"
    >
      <span className="min-w-0">
        <Truncate
          text={row.description.primary}
          className="block text-[12.5px] leading-[1.3] font-medium"
        />
        <Truncate
          className="block font-mono text-[11px] leading-[1.4] text-ink-3"
          text={[
            formatDateStamp(row.date, { year: "always" }),
            row.account === null ? null : accountLabel(row.account),
            row.typeName,
          ]
            .filter((part) => part !== null && part !== "")
            .join(" · ")}
        />
      </span>
      {row.primaryAmount === null ? (
        <Figure value={null} size="base" emptyLabel="No entries" />
      ) : (
        <Figure
          {...nativeFigureProps(row.primaryAmount)}
          intent={row.figureIntent}
          className="text-right"
        />
      )}
      {onRemove === undefined ? (
        <span aria-hidden className="w-[18px]" />
      ) : (
        <button
          type="button"
          aria-label={`${REMOVE_MEMBER}: ${row.description.primary}`}
          onClick={onRemove}
          className={cn(
            "flex size-[18px] items-center justify-center rounded-chip text-ink-3 outline-none hover:text-ink",
            focusRing.chip
          )}
        >
          <XIcon aria-hidden className="size-3" />
        </button>
      )}
    </li>
  )
}

function CategoryField({
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
  const catalogue = useCategoryCatalogue(userId)

  const options = useMemo<FieldOption[]>(
    () =>
      catalogue.groups.flatMap((group) =>
        group.categories.map((category) => ({
          value: String(category.id),
          label: category.name,
          group: group.type.name,
          icon: category.icon,
        }))
      ),
    [catalogue]
  )

  return (
    <SelectField
      label={CATEGORY_LABEL}
      hint={CATEGORY_HINT}
      placeholder={CATEGORY_PLACEHOLDER}
      value={value === null ? "" : String(value)}
      options={options}
      errors={errors}
      onChange={(next) => {
        onChange(next === "" ? null : Number(next))
      }}
    />
  )
}

function CategoryFieldSkeleton() {
  return (
    <div className="flex flex-col gap-2" role="status" aria-busy>
      <span className="sr-only">Loading your categories</span>
      <SkeletonBar height={9} width={72} />
      <SkeletonBar height={40} />
    </div>
  )
}

function MemberPicker({
  userId,
  excluded,
  onPick,
  errors,
}: {
  userId: UserId
  excluded: ReadonlySet<string>
  onPick: (row: LedgerTransactionRow) => void
  errors: readonly string[]
}) {
  const search = useUngroupedSearch(userId)

  const available = useMemo(
    () => search.results.filter((row) => !excluded.has(row.transactionId)),
    [search.results, excluded]
  )

  const options = useMemo<FieldOption[]>(
    () =>
      available.map((row) => ({
        value: row.transactionId,
        label: row.description.primary,
        subLabel: [
          formatDateStamp(row.date, { year: "always" }),
          row.account === null ? null : accountLabel(row.account),
        ]
          .filter((part) => part !== null && part !== "")
          .join(" · "),
      })),
    [available]
  )

  return (
    <SelectField
      label={MEMBERS_LABEL}
      hint={MEMBER_PICKER_HINT}
      placeholder={MEMBER_PICKER_PLACEHOLDER}
      emptyLabel={MEMBER_PICKER_EMPTY}
      value=""
      options={options}
      errors={errors}
      search={{
        query: search.query,
        onQueryChange: search.setQuery,
        pending: search.pending,
        hasMore: search.hasMore,
        onLoadMore: search.loadMore,
        total: search.total,
      }}
      onChange={(next) => {
        const picked = available.find((row) => row.transactionId === next)
        if (picked !== undefined) onPick(picked)
      }}
    />
  )
}

function GroupComposerForm({
  userId,
  target,
  actions,
  onClose,
  now,
}: {
  userId: UserId
  target: GroupComposerTarget
  actions: GroupActions
  onClose: () => void
  now: Date
}) {
  const formId = useId()
  const mode = target.kind
  const [draft, setDraft] = useState<GroupDraft>(() =>
    target.kind === "add"
      ? seedAddDraft(target.group, target.seed)
      : seedGroupDraft(target.seed, now)
  )
  const [submitted, setSubmitted] = useState(false)

  const errors = groupDraftErrors(draft, mode)
  const shown = submitted ? errors : {}
  const isPending = mode === "add" ? actions.isAdding : actions.isCreating

  const held = useMemo(
    () =>
      target.kind === "add"
        ? target.group.raw.transactions.map((child) => child.transaction_id)
        : [],
    [target]
  )

  const excluded = useMemo(
    () =>
      new Set([
        ...held,
        ...draft.members.map((member) => member.transactionId),
      ]),
    [held, draft.members]
  )

  const submit = () => {
    setSubmitted(true)
    const resolved = resolveGroupDraft(draft, mode)
    if (resolved === null) return
    if (target.kind === "add") {
      actions.addToGroup(target.group, resolved, { onSuccess: onClose })
      return
    }
    actions.createGroup(resolved, { onSuccess: onClose })
  }

  const parsedLabel = draft.date === null ? null : formatEditorDate(draft.date)

  return (
    <>
      <form
        id={formId}
        data-slot="group-composer-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        className="flex flex-col gap-4 px-4 pt-4 pb-5 sm:px-6 sm:pt-5"
      >
        <p
          data-slot="group-composer-intro"
          className="rounded-md bg-brand-dim px-[13px] py-[11px] text-[11.5px] leading-[1.5] text-pretty text-ink-2"
        >
          {mode === "add" ? ADD_INTRO : CREATE_INTRO}
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
          hint={
            parsedLabel === null ? (
              DATE_HINT
            ) : (
              <span
                data-slot="group-date-echo"
                className="font-mono text-brand"
              >
                {parsedLabel}
              </span>
            )
          }
          errors={shown.date === undefined ? [] : [shown.date]}
          onChange={(dateText) => {
            setDraft((previous) => ({
              ...previous,
              dateText,
              date: parseEditorDate(dateText, now).date,
            }))
          }}
        />

        <PanelBoundary pending={<CategoryFieldSkeleton />}>
          <CategoryField
            userId={userId}
            value={draft.categoryId}
            errors={shown.category === undefined ? [] : [shown.category]}
            onChange={(categoryId) => {
              setDraft((previous) => ({ ...previous, categoryId }))
            }}
          />
        </PanelBoundary>

        <MemberPicker
          userId={userId}
          excluded={excluded}
          errors={shown.members === undefined ? [] : [shown.members]}
          onPick={(row) => {
            setDraft((previous) => withMember(previous, row))
          }}
        />
      </form>

      <section
        data-slot="group-composer-members"
        className="border-t border-border px-4 pt-4 pb-5 sm:px-6"
      >
        {target.kind === "add" ? (
          <>
            <p className="text-[11px] leading-[1.5] text-pretty text-ink-3">
              {existingMembersNote(held.length)}
            </p>
            <ul className="mt-2 mb-4">
              {target.group.children.map((child) => (
                <MemberRow key={child.rowId} row={child} />
              ))}
            </ul>
          </>
        ) : null}

        {draft.members.length === 0 ? (
          <p
            data-slot="group-members-empty"
            className="text-[12px] leading-[1.5] text-ink-3"
          >
            {MEMBERS_EMPTY}
          </p>
        ) : (
          <ul>
            {draft.members.map((member) => (
              <MemberRow
                key={member.rowId}
                row={member}
                onRemove={() => {
                  setDraft((previous) =>
                    withoutMember(previous, member.transactionId)
                  )
                }}
              />
            ))}
          </ul>
        )}

        <p
          data-slot="group-members-note"
          className="mt-3 text-[11px] leading-[1.5] text-pretty text-ink-3"
        >
          {membersNote(draft.members.length, mode)}
        </p>
      </section>

      <div
        data-slot="group-composer-actions"
        className="flex items-center gap-2 border-t border-border px-4 py-4 sm:px-6"
      >
        <Button
          type="submit"
          form={formId}
          disabled={isPending}
          className="h-auto rounded-button px-[15px] py-[9px] text-[12.5px] leading-none font-semibold"
        >
          {isPending ? SAVING : mode === "add" ? SAVE_ADD : SAVE_CREATE}
        </Button>
        <span className="flex-1" />
        <Button
          variant="ghost"
          onClick={onClose}
          className="h-auto rounded-sm px-3 py-[9px] text-[12.5px] leading-none font-semibold text-ink-2"
        >
          {CANCEL}
        </Button>
      </div>
    </>
  )
}

export function GroupComposer({
  userId,
  controller,
  actions,
  now,
}: {
  userId: UserId
  controller: {
    readonly target: GroupComposerTarget | null
    readonly isOpen: boolean
    readonly instanceKey: string
    readonly setOpen: (open: boolean) => void
    readonly close: () => void
  }
  actions: GroupActions
  now?: Date
}) {
  const target = controller.target
  const clock = now ?? new Date()

  return (
    <AdaptiveSheet
      open={controller.isOpen && target !== null}
      onOpenChange={controller.setOpen}
      eyebrow={GROUP_EYEBROW}
      title={target?.kind === "add" ? ADD_TITLE : CREATE_TITLE}
      width={472}
      className={GROUP_COMPOSER_SHEET_CLASS}
    >
      {target === null ? null : (
        <GroupComposerForm
          key={controller.instanceKey}
          userId={userId}
          target={target}
          actions={actions}
          onClose={controller.close}
          now={clock}
        />
      )}
    </AdaptiveSheet>
  )
}
