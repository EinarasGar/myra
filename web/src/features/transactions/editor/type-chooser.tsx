import { useEffect, useId, useMemo, useState } from "react"
import type { KeyboardEvent } from "react"

import type { TransactionTypeTag } from "@/lib/domain/transaction-types"
import { TRANSACTION_TYPE_GROUPS } from "@/lib/domain/transaction-types"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { focusRing } from "@/components/primitives"

import {
  CHOOSER_EMPTY,
  CHOOSER_FILTER_PLACEHOLDER,
  CHOOSER_KEEPS_INPUT,
} from "./copy"

function matches(haystack: readonly string[], needle: string): boolean {
  const query = needle.trim().toLowerCase()
  if (query === "") return true
  return haystack.some((value) => value.toLowerCase().includes(query))
}

export function TypeChooser({
  selected,
  onSelect,
  showsKeyHints,
}: {
  selected: TransactionTypeTag | null
  onSelect: (type: TransactionTypeTag) => void
  showsKeyHints: boolean
}) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const listId = useId()

  const groups = useMemo(
    () =>
      TRANSACTION_TYPE_GROUPS.map((group) => ({
        ...group,
        types: group.types.filter((config) =>
          matches([config.chooserName, config.name, config.description], query)
        ),
      })).filter((group) => group.types.length > 0),
    [query]
  )

  const order = useMemo(
    () => groups.flatMap((group) => group.types.map((config) => config.type)),
    [groups]
  )

  const clamped = Math.min(activeIndex, order.length - 1)
  const active = clamped < 0 ? null : (order[clamped] ?? null)
  const optionId = (type: TransactionTypeTag) => `${listId}-${type}`

  useEffect(() => {
    if (active === null) return
    document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({
      block: "nearest",
    })
  }, [active, listId])

  const onFilterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (order.length === 0) return
      const step = event.key === "ArrowDown" ? 1 : -1
      setActiveIndex(
        (order.length + Math.max(clamped, 0) + step) % order.length
      )
      return
    }
    if (event.key !== "Enter") return
    event.preventDefault()
    if (active === null) return
    onSelect(active)
  }

  return (
    <div data-slot="type-chooser">
      <div className="flex items-center gap-[9px] rounded-button border border-border-strong bg-surface-2 px-3 py-[9px]">
        <Input
          role="combobox"
          aria-expanded
          aria-controls={listId}
          {...(active === null
            ? {}
            : { "aria-activedescendant": optionId(active) })}
          aria-label="Filter transaction types"
          placeholder={CHOOSER_FILTER_PLACEHOLDER}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={onFilterKeyDown}
          className="h-auto flex-1 rounded-none border-0 p-0 text-[12.5px] font-normal"
        />
        {showsKeyHints ? (
          <span className="font-mono text-[10px] leading-none font-medium text-ink-3">
            ↑↓ ⏎
          </span>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <p className="mt-[18px] text-[12px] leading-[1.6] text-ink-3">
          {CHOOSER_EMPTY}
        </p>
      ) : null}

      <div id={listId} role="listbox" aria-label="Transaction types">
        {groups.map((group) => (
          <section
            key={group.id}
            role="group"
            aria-label={group.name}
            className="mt-[18px]"
          >
            <div className="mb-[10px] flex items-center gap-[10px]">
              <h3 className="text-[9.5px] leading-none font-semibold tracking-[0.12em] text-ink-3 uppercase">
                {group.name}
              </h3>
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
              {group.types.map((config) => {
                const Icon = config.icon
                const chosen = config.type === selected
                const isActive = config.type === active
                return (
                  <button
                    key={config.type}
                    id={optionId(config.type)}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={chosen}
                    data-active={isActive ? "" : undefined}
                    onPointerEnter={() => {
                      setActiveIndex(order.indexOf(config.type))
                    }}
                    onClick={() => {
                      onSelect(config.type)
                    }}
                    className={cn(
                      "flex items-start gap-[11px] rounded-md border px-[13px] py-3 text-left outline-none",
                      chosen
                        ? "border-brand bg-brand-dim"
                        : "border-border hover:bg-surface-2",
                      isActive &&
                        !chosen &&
                        "border-border-strong bg-surface-2",
                      focusRing.md
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-6 flex-none items-center justify-center rounded-sm",
                        chosen
                          ? "bg-brand text-on-brand"
                          : "border border-border bg-surface-2 text-ink-2"
                      )}
                    >
                      <Icon className="size-[13px]" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] leading-[1.2] font-semibold text-ink">
                        {config.chooserName}
                      </span>
                      <span
                        className={cn(
                          "mt-1 block text-[11px] leading-[1.45] text-pretty",
                          chosen ? "text-ink-2" : "text-ink-3"
                        )}
                      >
                        {config.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-[18px] text-[11px] leading-[1.5] text-pretty text-ink-3">
        {CHOOSER_KEEPS_INPUT}
      </p>
    </div>
  )
}
