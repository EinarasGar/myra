import type { ReactNode } from "react"

import { focusRing } from "@/components/primitives"
import { cn } from "@/lib/utils"

function CardInner({
  glyph,
  title,
  body,
  note,
  chevron = false,
}: {
  glyph: string
  title: ReactNode
  body: ReactNode
  note?: ReactNode
  chevron?: boolean
}) {
  return (
    <>
      <span
        aria-hidden
        className="flex size-[30px] flex-none items-center justify-center rounded-md border border-border bg-surface-2 font-mono text-[13px] leading-none text-ink-2"
      >
        {glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-[1.3] font-semibold">
          {title}
        </span>
        <span className="mt-1 block text-[11.5px] leading-[1.5] text-pretty text-ink-3">
          {body}
        </span>
        {note ? (
          <span className="mt-[6px] block text-[11px] leading-[1.4] text-pretty text-ink-3">
            {note}
          </span>
        ) : null}
      </span>
      {chevron ? (
        <span
          aria-hidden
          className="flex-none text-[12px] leading-none text-ink-3"
        >
          ›
        </span>
      ) : null}
    </>
  )
}

export function PathNote({
  glyph,
  title,
  body,
}: {
  glyph: string
  title: ReactNode
  body: ReactNode
}) {
  return (
    <li className="flex items-center gap-[14px] rounded-panel border border-border px-4 py-[15px]">
      <CardInner glyph={glyph} title={title} body={body} />
    </li>
  )
}

export function PathAction({
  glyph,
  title,
  body,
  note,
  emphasis = false,
  disabled = false,
  onSelect,
}: {
  glyph: string
  title: ReactNode
  body: ReactNode
  note?: ReactNode
  emphasis?: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-[14px] rounded-panel border px-4 py-[15px] text-left transition-colors duration-instant ease-out-quick",
          emphasis
            ? "border-brand bg-brand-dim"
            : "border-border hover:bg-surface-2",
          disabled && "pointer-events-none opacity-50",
          focusRing.panel
        )}
      >
        <CardInner
          glyph={glyph}
          title={title}
          body={body}
          {...(note === undefined ? {} : { note })}
          chevron
        />
      </button>
    </li>
  )
}
