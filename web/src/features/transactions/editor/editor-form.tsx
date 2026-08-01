import type { ReactNode } from "react"

import type { TransactionFeeType } from "@/api"
import type { AssetRef } from "@/lib/domain/refs"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Figure } from "@/components/figure"
import { SegmentedControl } from "@/components/primitives"

import { AssetSearchField } from "./asset-field"
import {
  AMOUNT_MOVED,
  CATEGORY_HINT,
  DATE_HINT,
  DATE_UNPARSED,
  DESCRIPTION_HINT,
  FEES_ADD,
  FEES_EMPTY,
  FEES_NOTE,
  FEES_TITLE,
} from "./copy"
import type { EditorDraft, EditorFeeDraft, EditorSlotKey } from "./draft"
import { mirrorSlot, newFeeDraft, setSlot } from "./draft"
import { formatEditorDate } from "./date-input"
import type { EditorFieldErrors } from "./validation"
import type { EditorSlotView, EditorTypeView } from "./layout"
import { impliedRateView } from "./layout"
import { SelectField, TextField } from "./fields"
import { MoneyField } from "./money-field"
import type { ProvenanceLookup } from "./proposal"
import type { EditorReferences } from "./references"

const FEE_TYPE_OPTIONS: readonly {
  value: TransactionFeeType
  label: string
}[] = [
  { value: "transaction", label: "Transaction fee" },
  { value: "exchange", label: "Exchange fee" },
  { value: "withholding_tax", label: "Withholding tax" },
]

const FLOW_OPTIONS = [
  { value: "out", label: "Money out" },
  { value: "in", label: "Money in" },
] as const

export interface EditorFormProps {
  view: EditorTypeView
  draft: EditorDraft
  onDraft: (draft: EditorDraft) => void
  errors: EditorFieldErrors
  references: EditorReferences
  knownAssets: readonly AssetRef[]
  onAssetResolved: (asset: AssetRef) => void
  provenance: ProvenanceLookup
  assetName: (assetId: number | null) => string
  lookupAsset: (assetId: number | null) => AssetRef | null
}

/**
 * A saved transaction names an asset the search has never returned, so its own value has
 * to be handed to the picker or the field reads as unset the moment it is opened.
 */
function withCurrent(
  known: readonly AssetRef[],
  current: AssetRef | null
): readonly AssetRef[] {
  if (current === null) return known
  if (known.some((asset) => asset.assetId === current.assetId)) return known
  return [current, ...known]
}

function errorsFor(
  errors: EditorFieldErrors,
  field: string
): readonly string[] | undefined {
  return errors[field]
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
      {children}
    </span>
  )
}

function AssetControl({
  slot,
  draft,
  onDraft,
  references,
  knownAssets,
  onAssetResolved,
  provenance,
  errors,
  mirror,
  lookupAsset,
}: {
  slot: EditorSlotView
  draft: EditorDraft
  onDraft: (draft: EditorDraft) => void
  references: EditorReferences
  knownAssets: readonly AssetRef[]
  onAssetResolved: (asset: AssetRef) => void
  provenance: ProvenanceLookup
  errors: EditorFieldErrors
  mirror: boolean
  lookupAsset: (assetId: number | null) => AssetRef | null
}) {
  const field = `${slot.shape.field}.asset_id`
  const entry = draft.slots[slot.key]
  const apply = (assetId: number | null) => {
    onDraft(
      mirror
        ? mirrorSlot(draft, { assetId })
        : setSlot(draft, slot.key, { assetId })
    )
  }

  if (slot.shape.amountKind === "cash") {
    return (
      <SelectField
        label={mirror ? "Currency" : `${slot.shape.label} currency`}
        placeholder="Select a currency"
        value={entry.assetId === null ? "" : String(entry.assetId)}
        options={references.currencyOptions}
        {...(errorsFor(errors, field) === undefined
          ? {}
          : { errors: errorsFor(errors, field) })}
        mark={provenance.mark(field)}
        onChange={(value) => {
          apply(value === "" ? null : Number(value))
        }}
      />
    )
  }

  return (
    <AssetSearchField
      label={mirror ? "Asset" : `${slot.shape.label} asset`}
      value={entry.assetId}
      known={withCurrent(knownAssets, lookupAsset(entry.assetId))}
      onResolved={onAssetResolved}
      {...(errorsFor(errors, field) === undefined
        ? {}
        : { errors: errorsFor(errors, field) })}
      mark={provenance.mark(field)}
      onChange={apply}
    />
  )
}

/**
 * An account is denominated, so choosing one answers the currency question too. Only an
 * untouched cash slot is filled — a currency the user already picked is never overwritten.
 */
function withSuggestedCurrency(
  draft: EditorDraft,
  targets: readonly EditorSlotView[],
  accountId: string | null,
  references: EditorReferences
): EditorDraft {
  const assetId = references.suggestedCurrency(accountId)
  if (assetId === null) return draft
  return targets.reduce((next, target) => {
    if (target.shape.amountKind !== "cash") return next
    if (next.slots[target.key].assetId !== null) return next
    return setSlot(next, target.key, { assetId })
  }, draft)
}

function AccountControl({
  slot,
  slots,
  draft,
  onDraft,
  references,
  provenance,
  errors,
  mirror,
  label,
  hint,
}: {
  slot: EditorSlotView
  slots: readonly EditorSlotView[]
  draft: EditorDraft
  onDraft: (draft: EditorDraft) => void
  references: EditorReferences
  provenance: ProvenanceLookup
  errors: EditorFieldErrors
  mirror: boolean
  label: string
  hint?: string
}) {
  const field = `${slot.shape.field}.account_id`
  return (
    <SelectField
      label={label}
      {...(hint === undefined ? {} : { hint })}
      placeholder="Select an account"
      value={draft.slots[slot.key].accountId ?? ""}
      options={references.accountOptions}
      {...(errorsFor(errors, field) === undefined
        ? {}
        : { errors: errorsFor(errors, field) })}
      mark={provenance.mark(field)}
      onChange={(value) => {
        const accountId = value === "" ? null : value
        const targets = mirror
          ? slots
          : slots.filter((entry) => entry.key === slot.key)
        onDraft(
          withSuggestedCurrency(
            mirror
              ? mirrorSlot(draft, { accountId })
              : setSlot(draft, slot.key, { accountId }),
            targets,
            accountId,
            references
          )
        )
      }}
    />
  )
}

function AmountControl({
  slot,
  draft,
  onDraft,
  errors,
  provenance,
  unit,
  size,
  mirror,
  label,
}: {
  slot: EditorSlotView
  draft: EditorDraft
  onDraft: (draft: EditorDraft) => void
  errors: EditorFieldErrors
  provenance: ProvenanceLookup
  unit: string
  size: "hero" | "panel"
  mirror: boolean
  label?: string
}) {
  const field = `${slot.shape.field}.amount`
  return (
    <MoneyField
      label={label ?? slot.shape.label}
      size={size}
      unit={unit}
      signGlyph={slot.signGlyph}
      value={draft.slots[slot.key].amountText}
      {...(errorsFor(errors, field) === undefined
        ? {}
        : { errors: errorsFor(errors, field) })}
      mark={provenance.mark(field)}
      onChange={(amountText) => {
        onDraft(
          mirror
            ? mirrorSlot(draft, { amountText })
            : setSlot(draft, slot.key, { amountText })
        )
      }}
    />
  )
}

function FlowToggle({
  slotKey,
  draft,
  onDraft,
}: {
  slotKey: EditorSlotKey
  draft: EditorDraft
  onDraft: (draft: EditorDraft) => void
}) {
  return (
    <div>
      <SectionLabel>Direction</SectionLabel>
      <div className="mt-2">
        <SegmentedControl
          label="Direction"
          value={draft.slots[slotKey].flow}
          options={FLOW_OPTIONS}
          onValueChange={(flow) => {
            onDraft(setSlot(draft, slotKey, { flow }))
          }}
        />
      </div>
    </div>
  )
}

function FeeRows({
  draft,
  onDraft,
  references,
  errors,
}: {
  draft: EditorDraft
  onDraft: (draft: EditorDraft) => void
  references: EditorReferences
  errors: EditorFieldErrors
}) {
  const update = (index: number, patch: Partial<EditorFeeDraft>) => {
    onDraft({
      ...draft,
      fees: draft.fees.map((fee, position) =>
        position === index ? { ...fee, ...patch } : fee
      ),
    })
  }

  return (
    <section data-slot="editor-fees">
      <div className="mb-[9px] flex items-center gap-[10px]">
        <SectionLabel>{FEES_TITLE}</SectionLabel>
        <span aria-hidden className="h-px flex-1 bg-border" />
        <Button
          variant="ghost"
          onClick={() => {
            onDraft({
              ...draft,
              fees: [...draft.fees, newFeeDraft(draft.slots.primary.assetId)],
            })
          }}
          className="h-auto rounded-sm px-2 py-1 text-[11.5px] leading-none font-semibold text-brand"
        >
          {FEES_ADD}
        </Button>
      </div>

      {draft.fees.length === 0 ? (
        <p className="text-[11px] leading-[1.5] text-ink-3">{FEES_EMPTY}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {draft.fees.map((fee, index) => (
            <div
              key={fee.key}
              data-slot="fee-row"
              className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_120px_auto]"
            >
              <SelectField
                label="Account"
                placeholder="Select an account"
                value={fee.accountId ?? ""}
                options={references.accountOptions}
                {...(errorsFor(errors, `fees[${String(index)}].account_id`) ===
                undefined
                  ? {}
                  : {
                      errors: errorsFor(
                        errors,
                        `fees[${String(index)}].account_id`
                      ),
                    })}
                onChange={(value) => {
                  const accountId = value === "" ? null : value
                  const suggested = references.suggestedCurrency(accountId)
                  update(index, {
                    accountId,
                    ...(suggested === null || fee.assetId !== null
                      ? {}
                      : { assetId: suggested }),
                  })
                }}
              />
              <SelectField
                label="Currency"
                placeholder="Select a currency"
                value={fee.assetId === null ? "" : String(fee.assetId)}
                options={references.currencyOptions}
                {...(errorsFor(errors, `fees[${String(index)}].asset_id`) ===
                undefined
                  ? {}
                  : {
                      errors: errorsFor(
                        errors,
                        `fees[${String(index)}].asset_id`
                      ),
                    })}
                onChange={(value) => {
                  update(index, {
                    assetId: value === "" ? null : Number(value),
                  })
                }}
              />
              <MoneyField
                label="Amount"
                size="panel"
                signGlyph="−"
                value={fee.amountText}
                {...(errorsFor(errors, `fees[${String(index)}].amount`) ===
                undefined
                  ? {}
                  : {
                      errors: errorsFor(
                        errors,
                        `fees[${String(index)}].amount`
                      ),
                    })}
                onChange={(amountText) => {
                  update(index, { amountText })
                }}
              />
              <div className="flex flex-col gap-2">
                <SelectField
                  label="Kind"
                  placeholder="Fee kind"
                  value={fee.feeType}
                  options={FEE_TYPE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  onChange={(value) => {
                    update(index, { feeType: value as TransactionFeeType })
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={() => {
                    onDraft({
                      ...draft,
                      fees: draft.fees.filter(
                        (_, position) => position !== index
                      ),
                    })
                  }}
                  className="h-auto self-start rounded-sm px-2 py-1 text-[11px] leading-none font-semibold text-negative"
                >
                  Remove fee
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-[9px] text-[11px] leading-[1.5] text-pretty text-ink-3">
        {FEES_NOTE}
      </p>
    </section>
  )
}

function DateField({
  draft,
  onDraft,
  errors,
  provenance,
}: {
  draft: EditorDraft
  onDraft: (draft: EditorDraft) => void
  errors: EditorFieldErrors
  provenance: ProvenanceLookup
}) {
  const unparsed = draft.dateText.trim() !== "" && draft.date === null
  const parsedLabel = draft.date === null ? null : formatEditorDate(draft.date)
  return (
    <TextField
      label="Date"
      labelHint={DATE_HINT}
      placeholder="yesterday"
      value={draft.dateText}
      hint={
        parsedLabel === null ? undefined : (
          <span data-slot="date-echo" className="font-mono text-brand">
            {parsedLabel}
          </span>
        )
      }
      errors={
        unparsed ? [DATE_UNPARSED] : (errorsFor(errors, "date") ?? undefined)
      }
      mark={provenance.mark("date")}
      onChange={(dateText) => {
        onDraft({ ...draft, dateText })
      }}
    />
  )
}

export function EditorForm(props: EditorFormProps) {
  const {
    view,
    draft,
    onDraft,
    errors,
    references,
    knownAssets,
    onAssetResolved,
    provenance,
    assetName,
    lookupAsset,
  } = props

  const rate = impliedRateView(view, draft, assetName)
  const [first, second] = view.slots

  const dateBlock = (
    <DateField
      draft={draft}
      onDraft={onDraft}
      errors={errors}
      provenance={provenance}
    />
  )

  const feesBlock = (
    <FeeRows
      draft={draft}
      onDraft={onDraft}
      references={references}
      errors={errors}
    />
  )

  if (view.layout === "single" && first !== undefined) {
    return (
      <div data-slot="editor-single" className="flex flex-col gap-[17px]">
        <AmountControl
          slot={first}
          draft={draft}
          onDraft={onDraft}
          errors={errors}
          provenance={provenance}
          unit={assetName(draft.slots[first.key].assetId)}
          size="hero"
          mirror={false}
        />
        {view.showsFlowToggle ? (
          <FlowToggle slotKey={first.key} draft={draft} onDraft={onDraft} />
        ) : null}
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
          <AccountControl
            slot={first}
            slots={view.slots}
            draft={draft}
            onDraft={onDraft}
            references={references}
            provenance={provenance}
            errors={errors}
            mirror={false}
            label={first.shape.accountLabel}
          />
          <AssetControl
            slot={first}
            draft={draft}
            onDraft={onDraft}
            references={references}
            knownAssets={knownAssets}
            onAssetResolved={onAssetResolved}
            provenance={provenance}
            errors={errors}
            mirror={false}
            lookupAsset={lookupAsset}
          />
        </div>
        {view.showsOriginAsset ? (
          <AssetSearchField
            label="Paid by"
            value={draft.originAssetId}
            known={withCurrent(knownAssets, lookupAsset(draft.originAssetId))}
            onResolved={onAssetResolved}
            hint="The asset that paid this out."
            {...(errorsFor(errors, "origin_asset_id") === undefined
              ? {}
              : { errors: errorsFor(errors, "origin_asset_id") })}
            onChange={(originAssetId) => {
              onDraft({ ...draft, originAssetId })
            }}
          />
        ) : null}
        {view.showsCategory ? (
          <SelectField
            label="Category"
            hint={CATEGORY_HINT}
            placeholder="Select a category"
            value={draft.categoryId === null ? "" : String(draft.categoryId)}
            options={references.categoryOptions}
            {...(errorsFor(errors, "category_id") === undefined
              ? {}
              : { errors: errorsFor(errors, "category_id") })}
            mark={provenance.mark("category_id")}
            onChange={(value) => {
              onDraft({
                ...draft,
                categoryId: value === "" ? null : Number(value),
              })
            }}
          />
        ) : null}
        {view.showsDescription ? (
          <TextField
            label="Description"
            hint={DESCRIPTION_HINT}
            value={draft.description}
            {...(errorsFor(errors, "description") === undefined
              ? {}
              : { errors: errorsFor(errors, "description") })}
            mark={provenance.mark("description")}
            onChange={(description) => {
              onDraft({ ...draft, description })
            }}
          />
        ) : null}
        {dateBlock}
        {feesBlock}
      </div>
    )
  }

  if (first === undefined || second === undefined) return null

  return (
    <div data-slot="editor-dual" className="flex flex-col gap-4">
      {view.sharedAccount ? (
        <AccountControl
          slot={first}
          slots={view.slots}
          draft={draft}
          onDraft={onDraft}
          references={references}
          provenance={provenance}
          errors={errors}
          mirror
          label="Account"
          hint="Both sides of this transaction happen inside one account."
        />
      ) : null}
      {view.sharedAsset ? (
        <AssetControl
          slot={first}
          draft={draft}
          onDraft={onDraft}
          references={references}
          knownAssets={knownAssets}
          onAssetResolved={onAssetResolved}
          provenance={provenance}
          errors={errors}
          mirror
          lookupAsset={lookupAsset}
        />
      ) : null}
      {view.lockedMagnitude ? (
        <AmountControl
          slot={first}
          draft={draft}
          onDraft={onDraft}
          errors={errors}
          provenance={provenance}
          unit={assetName(draft.slots[first.key].assetId)}
          size="hero"
          mirror
          label={AMOUNT_MOVED}
        />
      ) : null}

      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_30px_1fr] sm:gap-0">
        {[first, second].map((slot, index) => (
          <div
            key={slot.shape.field}
            data-slot="direction-panel"
            data-direction={slot.isIncoming ? "incoming" : "outgoing"}
            className={cn(
              "rounded-md border px-[15px] pt-[14px] pb-[15px]",
              slot.isIncoming
                ? "border-brand bg-brand-dim"
                : "border-border-strong",
              index === 1 ? "sm:col-start-3" : ""
            )}
          >
            <div className="flex items-center gap-[7px]">
              <span
                aria-hidden
                className={cn(
                  "font-mono text-[10px] leading-none font-semibold",
                  slot.isIncoming ? "text-brand" : "text-ink-3"
                )}
              >
                {slot.signGlyph ?? "±"}
              </span>
              <span
                className={cn(
                  "text-[9.5px] leading-none font-semibold tracking-[0.11em] uppercase",
                  slot.isIncoming ? "text-brand" : "text-ink-3"
                )}
              >
                {slot.shape.label}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {view.sharedAccount ? null : (
                <AccountControl
                  slot={slot}
                  slots={view.slots}
                  draft={draft}
                  onDraft={onDraft}
                  references={references}
                  provenance={provenance}
                  errors={errors}
                  mirror={false}
                  label={slot.shape.accountLabel}
                />
              )}
              {view.sharedAsset ? null : (
                <AssetControl
                  slot={slot}
                  draft={draft}
                  onDraft={onDraft}
                  references={references}
                  knownAssets={knownAssets}
                  onAssetResolved={onAssetResolved}
                  provenance={provenance}
                  errors={errors}
                  mirror={false}
                  lookupAsset={lookupAsset}
                />
              )}
              {view.lockedMagnitude ? null : (
                <AmountControl
                  slot={slot}
                  draft={draft}
                  onDraft={onDraft}
                  errors={errors}
                  provenance={provenance}
                  unit={assetName(draft.slots[slot.key].assetId)}
                  size="panel"
                  mirror={false}
                />
              )}
            </div>
          </div>
        ))}
        <div
          aria-hidden
          className="hidden items-center justify-center sm:col-start-2 sm:flex"
        >
          <span className="flex size-6 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-[11px] leading-none text-ink-2">
            →
          </span>
        </div>
      </div>

      {rate === null ? null : (
        <div
          data-slot="implied-rate"
          className="flex flex-wrap items-center gap-[10px] rounded-md border border-dashed border-border-strong px-[13px] py-[10px]"
        >
          <SectionLabel>{rate.label}</SectionLabel>
          <Figure
            value={rate.value}
            kind="rate"
            decimals={4}
            className="flex-1 text-[12.5px] font-medium"
          />
          <span className="text-[11px] leading-none text-ink-3">
            {rate.note}
          </span>
        </div>
      )}

      {dateBlock}
      {feesBlock}
    </div>
  )
}
