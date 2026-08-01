import { useId, useMemo, useState, type KeyboardEvent } from "react"
import { Search } from "lucide-react"

import type { AssetRef } from "@/lib/domain/refs"
import { assetLabel } from "@/lib/domain/refs"
import { countOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Truncate } from "@/components/primitives"
import { Footnote } from "@/components/primitives/panel"
import { Input } from "@/components/ui/input"

import {
  CURRENCY_FOOTNOTE,
  CURRENCY_INTRO,
  CURRENCY_NAV_NOTE,
  CURRENCY_NO_MATCH,
  CURRENCY_PENDING,
  CURRENCY_SEARCH_PLACEHOLDER,
  CURRENCY_TITLE,
  STEP_LABEL,
} from "./copy"
import { StepFrame, StepNav } from "./step-layout"
import { ONBOARDING_STEPS, stepIndex } from "./steps"
import { useCurrencyAssets } from "./currency-assets"

interface BaseCurrencyStepProps {
  onConfirm: (asset: AssetRef) => void
  isSubmitting: boolean
  onBack?: () => void
}

function matches(asset: AssetRef, needle: string): boolean {
  if (needle === "") return true
  const lower = needle.toLowerCase()
  return (
    (asset.ticker ?? "").toLowerCase().includes(lower) ||
    (asset.name ?? "").toLowerCase().includes(lower)
  )
}

export function BaseCurrencyStep({
  onConfirm,
  isSubmitting,
  onBack,
}: BaseCurrencyStepProps) {
  const currencies = useCurrencyAssets()
  const listId = useId()
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<AssetRef | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  const shown = useMemo(
    () => currencies.filter((asset) => matches(asset, search)),
    [currencies, search]
  )

  const clamped = Math.min(activeIndex, shown.length - 1)
  const active = clamped < 0 ? null : (shown[clamped] ?? null)

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (shown.length === 0) return
      const down = event.key === "ArrowDown"
      if (clamped < 0) {
        setActiveIndex(down ? 0 : shown.length - 1)
        return
      }
      setActiveIndex((shown.length + clamped + (down ? 1 : -1)) % shown.length)
      return
    }
    if (event.key !== "Enter" || active === null) return
    if (selected?.assetId === active.assetId) return
    event.preventDefault()
    setSelected(active)
  }

  const nextLabel = isSubmitting
    ? CURRENCY_PENDING
    : selected
      ? `Use ${assetLabel(selected)}`
      : "Pick a currency"

  return (
    <StepFrame
      eyebrow={STEP_LABEL(stepIndex("currency"), ONBOARDING_STEPS.length)}
      title={CURRENCY_TITLE}
      intro={CURRENCY_INTRO}
      onSubmit={(event) => {
        event.preventDefault()
        if (selected === null || isSubmitting) return
        onConfirm(selected)
      }}
    >
      <div className="mt-6 overflow-hidden rounded-panel border border-border bg-surface">
        <div className="flex items-center gap-[10px] border-b border-border bg-surface-2 px-[15px] py-2">
          <Search aria-hidden className="size-[13px] flex-none text-ink-3" />
          <Input
            role="combobox"
            aria-expanded
            aria-controls={listId}
            {...(active
              ? { "aria-activedescendant": `${listId}-${active.assetId}` }
              : {})}
            aria-label={CURRENCY_SEARCH_PLACEHOLDER}
            placeholder={CURRENCY_SEARCH_PLACEHOLDER}
            value={search}
            disabled={isSubmitting}
            onChange={(event) => {
              setSearch(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={onSearchKeyDown}
            className="h-auto min-w-0 flex-1 rounded-none border-0 px-0 py-1 text-[12.5px] font-normal focus-visible:outline-none"
          />
          <span className="flex-none text-[11px] leading-none whitespace-nowrap text-ink-3">
            {shown.length === currencies.length
              ? countOf(currencies.length, "currency", "currencies")
              : `${String(shown.length)} of ${String(currencies.length)}`}
          </span>
        </div>

        {shown.length === 0 ? (
          <p className="px-[15px] py-[18px] text-[12px] leading-[1.5] text-ink-3">
            {CURRENCY_NO_MATCH}
          </p>
        ) : (
          <ul
            id={listId}
            role="listbox"
            aria-label={CURRENCY_SEARCH_PLACEHOLDER}
            className="max-h-[248px] overflow-y-auto"
          >
            {shown.map((asset, index) => {
              const isSelected = selected?.assetId === asset.assetId
              return (
                <li
                  key={asset.assetId}
                  id={`${listId}-${asset.assetId}`}
                  role="option"
                  aria-selected={isSelected}
                  data-active={index === clamped ? "" : undefined}
                  onClick={() => {
                    setSelected(asset)
                    setActiveIndex(index)
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-[14px] border-b border-border px-[15px] py-[13px] last:border-b-0",
                    isSelected ? "bg-brand-dim" : "hover:bg-surface-2",
                    index === clamped && !isSelected && "bg-surface-2"
                  )}
                >
                  <span
                    className={cn(
                      "w-[38px] flex-none font-mono text-[13px] leading-none font-semibold",
                      isSelected ? "text-brand" : "text-ink-2"
                    )}
                  >
                    {assetLabel(asset)}
                  </span>
                  <Truncate
                    text={asset.name ?? ""}
                    className="min-w-0 flex-1 text-[12.5px] leading-none font-medium"
                  />
                  {isSelected ? (
                    <span className="flex-none text-[10px] leading-none font-semibold tracking-[0.06em] text-brand uppercase">
                      Selected
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Footnote>{CURRENCY_FOOTNOTE}</Footnote>

      <StepNav
        {...(onBack ? { onBack } : {})}
        nextLabel={nextLabel}
        nextDisabled={selected === null || isSubmitting}
        note={CURRENCY_NAV_NOTE}
      />
    </StepFrame>
  )
}
