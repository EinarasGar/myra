import { useState, type KeyboardEvent } from "react"
import { Search } from "lucide-react"

import { KEYBOARD_ONLY } from "@/components/layout/breakpoints"
import { focusRing, HIT_TARGET } from "@/components/primitives"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

import type { LedgerFilterToken, LedgerQueryPlan } from "../api"
import { tokenLabel } from "../api"

import { QUERY_PLACEHOLDER, UNSUPPORTED_COPY } from "./copy"
import type { ExploreSearchPatch } from "./tokens"
import { clearToken, parseTokenInput } from "./tokens"

function QueryToken({
  token,
  applied,
  onClear,
}: {
  token: LedgerFilterToken
  applied: boolean
  onClear: () => void
}) {
  const { key, value } = tokenLabel(token)

  return (
    <span
      data-slot="query-token"
      data-token={token.key}
      data-applied={applied}
      title={applied ? undefined : UNSUPPORTED_COPY[token.key]}
      className={cn(
        "flex flex-none items-center gap-[6px] rounded-[5px] py-[5px] pr-[7px] pl-[8px] whitespace-nowrap",
        applied
          ? "bg-brand-dim"
          : "border border-dashed border-border-strong bg-transparent"
      )}
    >
      <span className="text-[11px] leading-none font-medium text-ink-3">
        {key}
      </span>
      <span
        className={cn(
          "text-[11.5px] leading-none font-semibold",
          applied ? "text-brand" : "text-ink-3 line-through"
        )}
      >
        {value}
      </span>
      {applied ? null : (
        <span className="text-[9px] leading-none font-semibold tracking-[0.06em] text-negative uppercase">
          Not applied
        </span>
      )}
      <button
        type="button"
        aria-label={`Remove ${key} filter`}
        onClick={onClear}
        className={cn(
          "text-[11px] leading-none outline-none",
          applied ? "text-brand" : "text-ink-3",
          HIT_TARGET,
          focusRing.chip
        )}
      >
        ✕
      </button>
    </span>
  )
}

export function QueryBar({
  tokens,
  plan,
  onPatch,
  onClearAll,
}: {
  tokens: readonly LedgerFilterToken[]
  plan: LedgerQueryPlan
  onPatch: (patch: ExploreSearchPatch) => void
  onClearAll: () => void
}) {
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)

  const unsupportedNotes = [
    ...new Map(
      plan.unsupportedTokens.map((token) => [token.key, tokenLabel(token).key])
    ).entries(),
  ]

  const commit = () => {
    const result = parseTokenInput(draft)
    if (result === null) return
    if (!result.ok) {
      setError(result.message)
      return
    }
    setError(null)
    setDraft("")
    onPatch(result.patch)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      commit()
      return
    }
    if (event.key === "Backspace" && draft === "" && tokens.length > 0) {
      const last = tokens[tokens.length - 1]
      if (last !== undefined) onPatch(clearToken(last))
    }
  }

  return (
    <div data-slot="query-bar">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border-strong bg-surface py-2 pr-[10px] pl-[13px]">
        <Search
          aria-hidden
          className="size-[14px] flex-none stroke-2 text-ink-3"
        />

        {tokens.map((token) => (
          <QueryToken
            key={token.key}
            token={token}
            applied={plan.appliedTokens.includes(token)}
            onClear={() => {
              onPatch(clearToken(token))
            }}
          />
        ))}

        <Input
          aria-label="Filter transactions"
          placeholder={QUERY_PLACEHOLDER}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setError(null)
          }}
          onKeyDown={onKeyDown}
          className="h-auto min-w-[160px] flex-1 rounded-none border-0 p-0 text-[12.5px] font-normal focus-visible:outline-none"
        />

        <Kbd
          className={cn(
            KEYBOARD_ONLY,
            "h-auto flex-none rounded-chip border border-border bg-transparent px-[5px] py-[3px] font-mono text-[10px] leading-none text-ink-3"
          )}
        >
          ⏎
        </Kbd>

        {tokens.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setDraft("")
              setError(null)
              onClearAll()
            }}
            className={cn(
              "flex-none border-l border-border pl-[10px] text-[11px] leading-none font-semibold whitespace-nowrap text-ink-3 outline-none",
              focusRing.chip
            )}
          >
            Clear
          </button>
        ) : null}
      </div>

      {error === null ? null : (
        <p
          role="alert"
          className="mt-[7px] text-[11px] leading-[1.5] text-pretty text-negative"
        >
          {error}
        </p>
      )}

      {unsupportedNotes.length === 0 ? null : (
        <div
          data-slot="unsupported-filters"
          role="status"
          className="mt-[7px] flex flex-col gap-[5px]"
        >
          {unsupportedNotes.map(([key, label]) => (
            <p
              key={key}
              data-unsupported={key}
              className="text-[11px] leading-[1.5] text-pretty text-ink-3"
            >
              <span className="font-semibold text-ink-2">{label}</span> is
              struck through because it is not filtering the rows below.{" "}
              {UNSUPPORTED_COPY[key]}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
