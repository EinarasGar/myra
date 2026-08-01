import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import type { UpdateAccount } from "@/api"
import { ACCOUNT_CLASS_LABELS, accountClassRank } from "@/lib/domain/accounts"
import type { AccountId, UserId } from "@/lib/query"
import { AdaptiveSheet } from "@/components/layout/adaptive-sheet"
import { EntityPicker, type PickerOption } from "@/components/primitives"
import { ErrorState } from "@/components/states/message-state"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { AccountFieldErrors, AccountFormState } from "./account-form"
import {
  accountFormFromDetail,
  accountServerErrors,
  emptyAccountForm,
  formatSharePercent,
  mergeFieldErrors,
  parseSharePercent,
  validateAccountForm,
} from "./account-form"
import {
  accountCreatedToast,
  accountCreateUndoneToast,
  accountUpdatedToast,
  accountUpdateUndoneToast,
} from "./account-toasts"
import { AccountDeleteDialog } from "./account-delete-dialog"
import {
  accountQueryOptions,
  useAccountLiquidityTypes,
  useAccountTypes,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "./api"
import {
  ACCOUNT_EDITOR_CREATE_TITLE,
  ACCOUNT_EDITOR_EYEBROW,
  CANCEL,
  DEACTIVATE_ACCOUNT,
  EDIT_ACCOUNT,
  IDENTIFIERS_HINT,
  IDENTIFIERS_LABEL,
  LIQUIDITY_HINT,
  LIQUIDITY_LABEL,
  NAME_HINT,
  NAME_LABEL,
  REFERENCE_ERROR_BODY,
  REFERENCE_ERROR_HEADLINE,
  RETRY,
  SAVE_CREATE,
  SAVE_EDIT,
  SAVING,
  SHARE_ALL_MINE,
  SHARE_HALF,
  SHARE_LABEL,
  SHARE_WHOLE,
  sharedConsequence,
  TYPE_HINT,
  TYPE_LABEL,
} from "./copy"
import { IdentifiersEditor } from "./identifiers-editor"

export type AccountEditorMode =
  | { readonly kind: "create" }
  | { readonly kind: "edit"; readonly accountId: AccountId }

const FORM_ID = "account-editor-form"
const HINT_CLASS = "text-[11.5px] leading-[1.5] text-pretty text-ink-3"
const LABEL_CLASS = "text-[11.5px] leading-none font-semibold text-ink-2"
const ERROR_CLASS = "text-[11.5px] leading-[1.5]"

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5" data-slot="account-form-skeleton">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

function FieldMessages({ messages }: { messages: readonly string[] }) {
  return (
    <>
      {messages.map((message) => (
        <FieldError key={message} className={ERROR_CLASS}>
          {message}
        </FieldError>
      ))}
    </>
  )
}

function AccountEditorForm({
  initial,
  typeOptions,
  liquidityOptions,
  serverErrors,
  formErrors,
  onDirty,
  onSubmit,
}: {
  initial: AccountFormState
  typeOptions: readonly PickerOption[]
  liquidityOptions: readonly PickerOption[]
  serverErrors: AccountFieldErrors
  formErrors: readonly string[]
  onDirty: () => void
  onSubmit: (payload: UpdateAccount) => void
}) {
  const [form, setForm] = useState(initial)
  const [submitted, setSubmitted] = useState(false)

  const validation = validateAccountForm(form)
  const errors = mergeFieldErrors(
    submitted ? validation.fieldErrors : {},
    serverErrors
  )
  const share = parseSharePercent(form.sharePercent)
  const shareConsequence =
    share.percent === null
      ? null
      : share.percent >= 100
        ? SHARE_WHOLE
        : sharedConsequence(share.percent)

  function patch(next: Partial<AccountFormState>) {
    setForm((previous) => ({ ...previous, ...next }))
    onDirty()
  }

  return (
    <form
      id={FORM_ID}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
        if (!validation.ok || validation.payload === null) return
        onSubmit(validation.payload)
      }}
    >
      {formErrors.length === 0 ? null : (
        <div
          role="alert"
          className="rounded-md border border-negative-dim bg-surface-2 px-[13px] py-[11px] text-[11.5px] leading-[1.5] text-pretty text-negative"
        >
          {formErrors.join(" ")}
        </div>
      )}

      <Field data-invalid={errors.name !== undefined}>
        <FieldLabel className={LABEL_CLASS} htmlFor="account-name">
          {NAME_LABEL}
        </FieldLabel>
        <Input
          id="account-name"
          value={form.name}
          autoComplete="off"
          {...(errors.name === undefined ? {} : { "aria-invalid": true })}
          onChange={(event) => {
            patch({ name: event.target.value })
          }}
        />
        <FieldDescription className={HINT_CLASS}>{NAME_HINT}</FieldDescription>
        <FieldMessages messages={errors.name ?? []} />
      </Field>

      <Field data-invalid={errors.account_type !== undefined}>
        <FieldLabel className={LABEL_CLASS} htmlFor="account-type">
          {TYPE_LABEL}
        </FieldLabel>
        <EntityPicker
          id="account-type"
          value={
            form.accountTypeId === null ? null : String(form.accountTypeId)
          }
          placeholder="Search account types"
          invalid={errors.account_type !== undefined}
          options={typeOptions}
          onValueChange={(next) => {
            patch({ accountTypeId: next === null ? null : Number(next) })
          }}
        />
        <FieldDescription className={HINT_CLASS}>{TYPE_HINT}</FieldDescription>
        <FieldMessages messages={errors.account_type ?? []} />
      </Field>

      <Field data-invalid={errors.liquidity_type !== undefined}>
        <FieldLabel className={LABEL_CLASS} htmlFor="account-liquidity">
          {LIQUIDITY_LABEL}
        </FieldLabel>
        <EntityPicker
          id="account-liquidity"
          value={
            form.liquidityTypeId === null ? null : String(form.liquidityTypeId)
          }
          placeholder="Search liquidity types"
          invalid={errors.liquidity_type !== undefined}
          options={liquidityOptions}
          onValueChange={(next) => {
            patch({ liquidityTypeId: next === null ? null : Number(next) })
          }}
        />
        <FieldDescription className={HINT_CLASS}>
          {LIQUIDITY_HINT}
        </FieldDescription>
        <FieldMessages messages={errors.liquidity_type ?? []} />
      </Field>

      <Field data-invalid={errors.ownership_share !== undefined}>
        <FieldLabel className={LABEL_CLASS} htmlFor="account-share">
          {SHARE_LABEL}
        </FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-[124px]">
            <Input
              id="account-share"
              className="pr-8 text-right font-mono tabular-nums"
              inputMode="decimal"
              autoComplete="off"
              value={form.sharePercent}
              {...(errors.ownership_share === undefined
                ? {}
                : { "aria-invalid": true })}
              onChange={(event) => {
                patch({ sharePercent: event.target.value })
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-[13px] flex items-center font-mono text-[12.5px] leading-none font-medium text-ink-3"
            >
              %
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              patch({ sharePercent: formatSharePercent(1) })
            }}
          >
            {SHARE_ALL_MINE}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              patch({ sharePercent: formatSharePercent(0.5) })
            }}
          >
            {SHARE_HALF}
          </Button>
        </div>
        {shareConsequence === null ? null : (
          <FieldDescription className={HINT_CLASS}>
            {shareConsequence}
          </FieldDescription>
        )}
        <FieldMessages messages={errors.ownership_share ?? []} />
      </Field>

      <Field>
        <FieldTitle className={LABEL_CLASS}>{IDENTIFIERS_LABEL}</FieldTitle>
        <IdentifiersEditor
          identifiers={form.identifiers}
          errors={errors}
          onChange={(identifiers) => {
            patch({ identifiers })
          }}
        />
        <FieldDescription className={HINT_CLASS}>
          {IDENTIFIERS_HINT}
        </FieldDescription>
      </Field>
    </form>
  )
}

export function AccountEditor({
  userId,
  mode,
  open,
  onOpenChange,
  onDeleted,
}: {
  userId: UserId
  mode: AccountEditorMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: (accountId: AccountId) => void
}) {
  const isEdit = mode.kind === "edit"
  const accountId = mode.kind === "edit" ? mode.accountId : null

  const types = useAccountTypes()
  const liquidityTypes = useAccountLiquidityTypes()
  const detail = useQuery({
    ...accountQueryOptions({ userId, accountId: accountId ?? "" }),
    enabled: open && accountId !== null,
  })

  const create = useCreateAccount(userId)
  const update = useUpdateAccount(userId, accountId)
  const remove = useDeleteAccount(userId)

  const [serverErrors, setServerErrors] = useState<AccountFieldErrors>({})
  const [formErrors, setFormErrors] = useState<readonly string[]>([])
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const loadedDetail = accountId === null ? null : (detail.data ?? null)

  const typeOptions = useMemo((): PickerOption[] => {
    const options = [...(types.data ?? [])]
    options.sort((a, b) => {
      const byClass =
        accountClassRank(a.accountClass) - accountClassRank(b.accountClass)
      return byClass === 0 ? a.name.localeCompare(b.name) : byClass
    })
    return options.map((option) => ({
      value: String(option.id),
      label: option.name,
      group: ACCOUNT_CLASS_LABELS[option.accountClass],
      ...(option.isLiquid ? { subLabel: "spendable today" } : {}),
    }))
  }, [types.data])

  const liquidityOptions = useMemo(
    (): PickerOption[] =>
      (liquidityTypes.data ?? []).map((entry) => ({
        value: String(entry.id),
        label: entry.name,
      })),
    [liquidityTypes.data]
  )

  const initial: AccountFormState | null = isEdit
    ? loadedDetail === null
      ? null
      : accountFormFromDetail(loadedDetail)
    : types.data === undefined || liquidityTypes.data === undefined
      ? null
      : emptyAccountForm({
          accountTypeId: types.data[0]?.id ?? null,
          liquidityTypeId: liquidityTypes.data[0]?.id ?? null,
        })

  const referenceFailed =
    types.isError || liquidityTypes.isError || (isEdit && detail.isError)
  const pending = create.isPending || update.isPending
  const saveLabel = isEdit ? SAVE_EDIT : SAVE_CREATE

  function close() {
    setServerErrors({})
    setFormErrors([])
    onOpenChange(false)
  }

  function submit(body: UpdateAccount) {
    const onError = (error: unknown) => {
      const mapped = accountServerErrors(error)
      setServerErrors(mapped.fieldErrors)
      setFormErrors(mapped.formErrors)
    }

    if (isEdit) {
      const previous: UpdateAccount | null =
        loadedDetail === null
          ? null
          : {
              name: loadedDetail.name,
              account_type: loadedDetail.accountTypeId,
              liquidity_type: loadedDetail.liquidityTypeId,
              ownership_share: loadedDetail.ownershipShare,
              identifiers: loadedDetail.identifiers,
            }
      update.mutate(
        { body },
        {
          onSuccess: () => {
            accountUpdatedToast({
              name: body.name,
              onUndo: () => {
                if (previous === null) return
                update.mutate(
                  { body: previous },
                  { onSuccess: accountUpdateUndoneToast }
                )
              },
            })
            close()
          },
          onError,
        }
      )
      return
    }

    create.mutate(
      { body },
      {
        onSuccess: (createdId) => {
          accountCreatedToast({
            name: body.name,
            onUndo: () => {
              remove.mutate(
                { accountId: createdId },
                { onSuccess: accountCreateUndoneToast }
              )
            },
          })
          close()
        },
        onError,
      }
    )
  }

  const title = isEdit
    ? (loadedDetail?.name ?? EDIT_ACCOUNT)
    : ACCOUNT_EDITOR_CREATE_TITLE

  return (
    <>
      <AdaptiveSheet
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true)
          else close()
        }}
        {...(isEdit ? { eyebrow: ACCOUNT_EDITOR_EYEBROW } : {})}
        title={title}
        width={440}
        footer={
          referenceFailed ? null : (
            <>
              {isEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="text-negative hover:bg-negative-dim hover:text-negative"
                  disabled={loadedDetail === null || pending}
                  onClick={() => {
                    setConfirmingDelete(true)
                  }}
                >
                  {DEACTIVATE_ACCOUNT}
                </Button>
              ) : null}
              <span className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={pending}
                onClick={close}
              >
                {CANCEL}
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
                size="lg"
                disabled={initial === null || pending}
              >
                {pending ? SAVING : saveLabel}
              </Button>
            </>
          )
        }
      >
        {referenceFailed ? (
          <ErrorState
            headline={REFERENCE_ERROR_HEADLINE}
            body={REFERENCE_ERROR_BODY}
            actions={[
              {
                label: RETRY,
                kind: "primary",
                onClick: () => {
                  void types.refetch()
                  void liquidityTypes.refetch()
                  if (isEdit) void detail.refetch()
                },
              },
            ]}
          />
        ) : initial === null ? (
          <FormSkeleton />
        ) : (
          <AccountEditorForm
            key={`${mode.kind}:${accountId ?? "new"}`}
            initial={initial}
            typeOptions={typeOptions}
            liquidityOptions={liquidityOptions}
            serverErrors={serverErrors}
            formErrors={formErrors}
            onDirty={() => {
              setServerErrors((previous) =>
                Object.keys(previous).length === 0 ? previous : {}
              )
              setFormErrors((previous) =>
                previous.length === 0 ? previous : []
              )
            }}
            onSubmit={submit}
          />
        )}
      </AdaptiveSheet>

      <AccountDeleteDialog
        userId={userId}
        account={
          accountId === null || loadedDetail === null
            ? null
            : { accountId, name: loadedDetail.name }
        }
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        onDeleted={(deletedId) => {
          setConfirmingDelete(false)
          close()
          onDeleted?.(deletedId)
        }}
      />
    </>
  )
}
