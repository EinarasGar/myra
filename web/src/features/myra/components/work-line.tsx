import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { focusRing, PULSE_CLASS, Truncate } from "@/components/primitives"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"

import { workSummary, type ToolPart } from "../api"
import {
  HIDE_RAW,
  HIDE_WORK,
  SHOW_RAW,
  SHOW_WORK,
  WORK_PARAMETERS,
  WORK_RAW_FOOT,
  WORK_RESULT,
  WORK_RUNNING,
} from "../copy"

const MARK = {
  running: { glyph: "◷", tone: "text-attention" },
  done: { glyph: "✓", tone: "text-positive" },
  failed: { glyph: "△", tone: "text-negative" },
} as const

function ParameterRows({ input }: { input: unknown }) {
  const entries = toEntries(input)
  if (entries.length === 0) {
    return (
      <p className="mt-[9px] text-[11px] leading-[1.5] text-ink-3">
        No parameters.
      </p>
    )
  }
  return (
    <div className="mt-[9px] flex flex-col gap-px overflow-hidden rounded-md border border-border bg-border">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="grid grid-cols-[110px_1fr] gap-3 bg-surface px-[11px] py-2 sm:grid-cols-[150px_1fr]"
        >
          <span className="font-mono text-[11.5px] leading-[1.4] break-all text-ink-3">
            {key}
          </span>
          <span className="min-w-0 text-[11.5px] leading-[1.4] font-medium break-words">
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

function StepRow({ step }: { step: ToolPart }) {
  const [rawOpen, setRawOpen] = useState(false)
  const mark = MARK[step.phase]

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-[11px] px-[14px] py-[10px]">
        <span
          aria-hidden
          className={cn(
            "w-[13px] flex-none text-center font-mono text-[11px] leading-none font-medium",
            mark.tone,
            step.phase === "running" && PULSE_CLASS
          )}
        >
          {mark.glyph}
        </span>
        <Truncate
          text={step.phase === "running" ? WORK_RUNNING : summarise(step.input)}
          className="min-w-0 flex-1 text-[12px] leading-[1.4]"
        />
        <span className="flex-none font-mono text-[10.5px] leading-none whitespace-nowrap text-ink-3">
          {step.name}
        </span>
        <button
          type="button"
          onClick={() => {
            setRawOpen((open) => !open)
          }}
          aria-expanded={rawOpen}
          className={cn(
            "flex-none text-[10.5px] leading-none font-medium whitespace-nowrap text-ink-3",
            focusRing.chip
          )}
        >
          {rawOpen ? HIDE_RAW : SHOW_RAW}
        </button>
      </div>
      {rawOpen ? (
        <div className="border-t border-border bg-surface-2 px-[14px] pt-3 pb-[13px]">
          <span className="text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
            {WORK_PARAMETERS}
          </span>
          <ParameterRows input={step.input} />
          <div className="mt-[11px] flex items-baseline gap-[9px]">
            <span className="flex-none text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
              {WORK_RESULT}
            </span>
            <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[11px] leading-[1.5] whitespace-pre-wrap text-ink-2">
              {step.output ?? "—"}
            </pre>
          </div>
          <p className="mt-[10px] text-[10.5px] leading-[1.5] text-ink-3">
            {WORK_RAW_FOOT}
          </p>
        </div>
      ) : null}
    </div>
  )
}

export function WorkLine({ steps }: { steps: readonly ToolPart[] }) {
  const [open, setOpen] = useState(false)
  const summary = workSummary(steps)
  const mark = summary.failed
    ? MARK.failed
    : summary.running
      ? MARK.running
      : MARK.done

  if (!open) {
    return (
      <Marker className="flex-wrap gap-x-[9px] gap-y-1 text-ink-3">
        <MarkerIcon
          className={cn(
            "size-auto font-mono text-[11px] leading-none font-medium",
            mark.tone,
            summary.running && PULSE_CLASS
          )}
        >
          {mark.glyph}
        </MarkerIcon>
        <MarkerContent className="text-[11.5px] leading-none">
          <Truncate text={summary.title} className="block" />
        </MarkerContent>
        <MarkerContent className="text-[11.5px] leading-none">
          · {summary.meta}
        </MarkerContent>
        <button
          type="button"
          onClick={() => {
            setOpen(true)
          }}
          aria-expanded={false}
          className={cn(
            "inline-flex items-center gap-1 text-[11px] leading-none font-semibold text-ink-3",
            focusRing.chip
          )}
        >
          {SHOW_WORK}
          <ChevronDown className="size-3" aria-hidden />
        </button>
      </Marker>
    )
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex items-center gap-[9px] border-b border-border px-[14px] py-[10px]">
        <span
          aria-hidden
          className={cn(
            "font-mono text-[11px] leading-none font-medium",
            mark.tone,
            summary.running && PULSE_CLASS
          )}
        >
          {mark.glyph}
        </span>
        <Truncate
          text={summary.title}
          className="min-w-0 text-[11.5px] leading-none font-semibold"
        />
        <Truncate
          text={`· ${summary.meta}`}
          className="flex-1 text-[11px] leading-none text-ink-3"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false)
          }}
          aria-expanded
          className={cn(
            "inline-flex flex-none items-center gap-1 text-[11px] leading-none font-semibold text-ink-3",
            focusRing.chip
          )}
        >
          {HIDE_WORK}
          <ChevronUp className="size-3" aria-hidden />
        </button>
      </div>
      {steps.map((step) => (
        <StepRow key={step.callId} step={step} />
      ))}
    </div>
  )
}

function toEntries(input: unknown): readonly [string, string][] {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return input === undefined ? [] : [["value", stringify(input)]]
  }
  return Object.entries(input as Record<string, unknown>).map(
    ([key, value]) => [key, stringify(value)]
  )
}

function summarise(input: unknown): string {
  const entries = toEntries(input)
  if (entries.length === 0) return "no parameters"
  return entries.map(([key, value]) => `${key}: ${value}`).join(" · ")
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (value === null || value === undefined) return "—"
  try {
    return JSON.stringify(value) ?? "—"
  } catch {
    return "—"
  }
}
