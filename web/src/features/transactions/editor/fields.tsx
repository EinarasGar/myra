import { useId, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { PickerOption, PickerSearch } from "@/components/primitives"
import { EntityPicker } from "@/components/primitives"

import {
  previousValueNote,
  PROPOSAL_CORRECTED_LABEL,
  PROPOSAL_FILLED_LABEL,
} from "./copy"
import type { ProvenanceMark } from "./proposal"

export interface ProvenanceFieldProps {
  errors?: readonly string[]
  mark?: ProvenanceMark | null
  hint?: ReactNode
}

export type FieldOption = PickerOption

interface FieldFrameProps {
  label: string
  labelHint?: string
  hint?: ReactNode
  errors?: readonly string[]
  mark?: ProvenanceMark | null
  children: (control: {
    id: string
    describedBy: string | undefined
    invalid: boolean
  }) => ReactNode
  className?: string
}

export function EditorField({
  label,
  labelHint,
  hint,
  errors = [],
  mark = null,
  children,
  className,
}: FieldFrameProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const invalid = errors.length > 0
  const previous =
    mark?.kind === "corrected" ? previousValueNote(mark.previousLabel) : null
  const describedBy =
    [
      invalid ? errorId : null,
      hint !== undefined || previous !== null ? hintId : null,
    ]
      .filter((value): value is string => value !== null)
      .join(" ") || undefined

  return (
    <div data-slot="editor-field" className={cn("min-w-0", className)}>
      <div className="mb-2 flex items-center gap-2">
        <label
          htmlFor={id}
          className="text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase"
        >
          {label}
        </label>
        {mark?.kind === "filled" ? (
          <span
            data-slot="provenance-dot"
            aria-label={PROPOSAL_FILLED_LABEL}
            className="size-[5px] rounded-full bg-brand"
          />
        ) : null}
        {mark?.kind === "corrected" ? (
          <span
            data-slot="provenance-edited"
            className="rounded-chip bg-attention-dim px-[5px] py-[3px] text-[9px] leading-none font-semibold tracking-[0.06em] text-attention uppercase"
          >
            {PROPOSAL_CORRECTED_LABEL}
          </span>
        ) : null}
        {labelHint === undefined ? null : (
          <span className="text-[10.5px] leading-none text-ink-3">
            {labelHint}
          </span>
        )}
      </div>
      {children({ id, describedBy, invalid })}
      {invalid ? (
        <p
          id={errorId}
          data-slot="field-error"
          className="mt-[7px] text-[11px] leading-[1.5] text-negative"
        >
          {errors.join(" ")}
        </p>
      ) : null}
      {hint === undefined && previous === null ? null : (
        <p
          id={hintId}
          className="mt-[6px] text-[10.5px] leading-[1.5] text-pretty text-ink-3"
        >
          {previous ?? hint}
        </p>
      )}
    </div>
  )
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  emptyLabel,
  search,
  ...frame
}: Omit<FieldFrameProps, "children"> & {
  value: string
  onChange: (value: string) => void
  options: readonly FieldOption[]
  placeholder: string
  disabled?: boolean
  emptyLabel?: string
  search?: PickerSearch
}) {
  return (
    <EditorField {...frame}>
      {({ id, describedBy, invalid }) => (
        <EntityPicker
          id={id}
          value={value === "" ? null : value}
          options={options}
          placeholder={placeholder}
          disabled={disabled}
          invalid={invalid}
          {...(describedBy === undefined ? {} : { describedBy })}
          {...(emptyLabel === undefined ? {} : { emptyLabel })}
          {...(search === undefined ? {} : { search })}
          onValueChange={(next) => {
            onChange(next ?? "")
          }}
        />
      )}
    </EditorField>
  )
}

export function TextField({
  value,
  onChange,
  placeholder,
  ...frame
}: Omit<FieldFrameProps, "children"> & {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <EditorField {...frame}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          value={value}
          aria-invalid={invalid}
          {...(describedBy === undefined
            ? {}
            : { "aria-describedby": describedBy })}
          {...(placeholder === undefined ? {} : { placeholder })}
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
      )}
    </EditorField>
  )
}
