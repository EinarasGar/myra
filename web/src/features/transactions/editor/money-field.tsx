import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
} from "@/components/ui/number-field"

import { EditorField, type ProvenanceFieldProps } from "./fields"
import { moneyText, parseMoney } from "./money"

const FORMAT: Intl.NumberFormatOptions = {
  maximumFractionDigits: 12,
  useGrouping: false,
}

const STEPPED = new Set([
  "keyboard",
  "increment-press",
  "decrement-press",
  "wheel",
  "scrub",
])

export interface MoneyFieldProps extends ProvenanceFieldProps {
  label: string
  labelHint?: string
  value: string
  onChange: (value: string) => void
  unit?: string
  unitControl?: ReactNode
  size?: "hero" | "panel"
  signGlyph?: "+" | "−" | null
  className?: string
}

/**
 * The draft holds the characters typed, so the number field is told the parsed value but
 * shows the text: half-typed states survive, and blur writes back the one reading of them
 * the ledger will actually save.
 */
export function MoneyField({
  label,
  labelHint,
  value,
  onChange,
  unit,
  unitControl,
  size = "hero",
  signGlyph,
  className,
  ...frame
}: MoneyFieldProps) {
  const parsed = parseMoney(value)

  return (
    <EditorField
      label={label}
      {...(labelHint === undefined ? {} : { labelHint })}
      {...(className === undefined ? {} : { className })}
      {...frame}
    >
      {({ id, describedBy, invalid }) => (
        <NumberField
          id={id}
          value={parsed}
          min={0}
          smallStep={0.01}
          largeStep={10}
          format={FORMAT}
          onValueChange={(next, details) => {
            if (!STEPPED.has(details.reason)) return
            onChange(next === null ? "" : moneyText(next))
          }}
        >
          <NumberFieldGroup
            data-slot="amount-field"
            data-invalid={invalid}
            className="data-[invalid=true]:border-negative"
          >
            {signGlyph ? (
              <span
                aria-hidden
                className="flex items-center pl-[15px] font-mono text-[16px] leading-none font-semibold text-ink-3"
              >
                {signGlyph}
              </span>
            ) : null}
            <NumberFieldInput
              value={value}
              aria-invalid={invalid}
              {...(describedBy === undefined
                ? {}
                : { "aria-describedby": describedBy })}
              onChange={(event) => {
                onChange(event.target.value)
              }}
              onPaste={(event) => {
                event.preventDefault()
                const input = event.currentTarget
                const start = input.selectionStart ?? value.length
                const end = input.selectionEnd ?? value.length
                const pasted = event.clipboardData.getData("text/plain")
                onChange(value.slice(0, start) + pasted + value.slice(end))
              }}
              onBlur={() => {
                const settled = parseMoney(value)
                if (settled === null) return
                const text = moneyText(settled)
                if (text !== value) onChange(text)
              }}
              className={cn(
                "h-auto flex-1 rounded-none border-0 px-[15px] py-[13px] font-mono tracking-[-0.02em] tabular-nums",
                size === "hero"
                  ? "text-[22px] leading-none font-semibold"
                  : "text-[16px] leading-none font-semibold"
              )}
            />
            {unitControl ?? null}
            {unitControl === undefined && unit !== undefined ? (
              <span className="flex items-center border-l border-border bg-surface-2 px-[14px] text-[12px] leading-none font-semibold text-ink-2">
                {unit}
              </span>
            ) : null}
          </NumberFieldGroup>
        </NumberField>
      )}
    </EditorField>
  )
}
