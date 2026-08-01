import { PlusIcon, XIcon } from "lucide-react"

import type { AccountIdentifierKind } from "@/api"
import { cn } from "@/lib/utils"
import { EntityPicker, focusRing } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { AccountFieldErrors, IdentifierDraft } from "./account-form"
import {
  IDENTIFIER_KIND_LABELS,
  IDENTIFIER_KIND_PLACEHOLDERS,
  IDENTIFIER_KINDS,
  identifierRowErrors,
  newIdentifierDraft,
} from "./account-form"
import { ADD_IDENTIFIER, IDENTIFIERS_EMPTY, REMOVE_IDENTIFIER } from "./copy"

const KIND_OPTIONS = IDENTIFIER_KINDS.map((kind) => ({
  value: kind,
  label: IDENTIFIER_KIND_LABELS[kind],
}))

function IdentifierRow({
  draft,
  index,
  errors,
  onChange,
  onRemove,
}: {
  draft: IdentifierDraft
  index: number
  errors: readonly string[]
  onChange: (next: IdentifierDraft) => void
  onRemove: () => void
}) {
  const invalid = errors.length > 0
  const valueId = `identifier-value-${draft.key}`
  const kindId = `identifier-kind-${draft.key}`

  return (
    <li className="flex flex-col gap-[6px]">
      <div className="flex items-start gap-2">
        <div className="w-[152px] flex-none">
          <EntityPicker
            id={kindId}
            size="sm"
            value={draft.kind}
            label={`Identifier ${String(index + 1)} kind`}
            placeholder="Kind"
            options={KIND_OPTIONS}
            onValueChange={(next) => {
              if (next === null) return
              onChange({
                ...draft,
                kind: next as AccountIdentifierKind,
                value: "",
              })
            }}
          />
        </div>
        <Input
          id={valueId}
          className="h-9 flex-1 py-[9px] text-[12px]"
          value={draft.value}
          spellCheck={false}
          autoComplete="off"
          aria-label={`${IDENTIFIER_KIND_LABELS[draft.kind]} value`}
          {...(invalid ? { "aria-invalid": true } : {})}
          placeholder={IDENTIFIER_KIND_PLACEHOLDERS[draft.kind]}
          onChange={(event) => {
            onChange({ ...draft, value: event.target.value })
          }}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${REMOVE_IDENTIFIER} ${IDENTIFIER_KIND_LABELS[draft.kind]}`}
          className={cn(
            "mt-[10px] flex size-4 flex-none items-center justify-center rounded-chip text-ink-3 outline-none hover:text-negative",
            focusRing.chip
          )}
        >
          <XIcon aria-hidden className="size-3" />
        </button>
      </div>
      {errors.map((message) => (
        <FieldError key={message} className="text-[11.5px] leading-[1.5]">
          {message}
        </FieldError>
      ))}
    </li>
  )
}

export function IdentifiersEditor({
  identifiers,
  errors,
  onChange,
}: {
  identifiers: readonly IdentifierDraft[]
  errors: AccountFieldErrors
  onChange: (next: readonly IdentifierDraft[]) => void
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      {identifiers.length === 0 ? (
        <p className="text-[11.5px] leading-[1.5] text-ink-3">
          {IDENTIFIERS_EMPTY}
        </p>
      ) : (
        <ul className="flex flex-col gap-[10px]">
          {identifiers.map((draft, index) => (
            <IdentifierRow
              key={draft.key}
              draft={draft}
              index={index}
              errors={identifierRowErrors(errors, index)}
              onChange={(next) => {
                onChange(
                  identifiers.map((entry) =>
                    entry.key === draft.key ? next : entry
                  )
                )
              }}
              onRemove={() => {
                onChange(identifiers.filter((entry) => entry.key !== draft.key))
              }}
            />
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          onChange([...identifiers, newIdentifierDraft()])
        }}
      >
        <PlusIcon aria-hidden data-icon="inline-start" />
        {ADD_IDENTIFIER}
      </Button>
    </div>
  )
}
