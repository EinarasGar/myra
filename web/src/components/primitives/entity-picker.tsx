import { useMemo, useState } from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { ChevronDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox"

import { GlyphIcon } from "./row-glyph"
import type {
  PickerGroup,
  PickerOption,
  PickerSearch,
} from "./entity-picker-options"
import {
  groupPickerOptions,
  PICKER_CLEAR,
  PICKER_EMPTY,
  PICKER_LOAD_MORE,
  PICKER_OPEN,
  PICKER_SEARCHING,
  pickerOptionMatches,
  pickerStatusLine,
} from "./entity-picker-options"
import { EntityMark } from "./entity-mark"
import { focusRing } from "./focus-ring"
import { Truncate } from "./truncate"

interface EntityPickerProps {
  value: string | null
  onValueChange: (value: string | null) => void
  options: readonly PickerOption[]
  placeholder: string
  id?: string
  label?: string
  describedBy?: string
  invalid?: boolean
  disabled?: boolean
  emptyLabel?: string
  size?: "sm" | "default"
  search?: PickerSearch
  className?: string
}

const TYPING_REASONS = new Set(["input-change", "input-paste"])

function OptionRow({ option }: { option: PickerOption }) {
  const subLabel =
    option.subLabel === undefined || option.subLabel === option.label
      ? null
      : option.subLabel
  return (
    <>
      {option.icon === undefined ? (
        option.identity === undefined ? null : (
          <EntityMark seed={option.identity} label={option.label} />
        )
      ) : (
        <GlyphIcon icon={option.icon} className="flex-none text-ink-3" />
      )}
      <Truncate
        text={option.label}
        className="min-w-0 text-[12.5px] leading-[1.35] font-medium text-ink"
      />
      {subLabel === null ? null : (
        <Truncate
          text={subLabel}
          className="min-w-0 flex-1 text-[11px] leading-[1.35] text-ink-3"
        />
      )}
    </>
  )
}

export function EntityPicker({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  label,
  describedBy,
  invalid = false,
  disabled = false,
  emptyLabel = PICKER_EMPTY,
  size = "default",
  search,
  className,
}: EntityPickerProps) {
  const [typed, setTyped] = useState("")
  const [open, setOpen] = useState(false)

  const grouped = options.some(
    (option) => option.group !== undefined && option.group !== ""
  )
  const items = useMemo(
    () => (grouped ? groupPickerOptions(options) : options),
    [grouped, options]
  )
  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  )
  const matchCount = useMemo(
    () =>
      search === undefined
        ? options.filter((option) => pickerOptionMatches(option, typed)).length
        : options.length,
    [search, options, typed]
  )

  const setQuery = (next: string) => {
    if (search === undefined) {
      setTyped(next)
      return
    }
    search.onQueryChange(next)
  }

  const itemClass = "gap-[9px] rounded-button py-[7px] pr-8 pl-2"

  return (
    <ComboboxPrimitive.Root<PickerOption>
      items={items}
      value={selected}
      open={open}
      disabled={disabled}
      autoHighlight
      filter={
        search === undefined
          ? (option, query) => pickerOptionMatches(option, query)
          : null
      }
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      isItemEqualToValue={(a, b) => a.value === b.value}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
      onValueChange={(next) => {
        onValueChange(next === null ? null : next.value)
      }}
      onInputValueChange={(next, details) => {
        setQuery(TYPING_REASONS.has(details.reason) ? next : "")
      }}
    >
      <ComboboxPrimitive.InputGroup
        data-slot="entity-picker"
        data-size={size}
        className={cn("relative w-full min-w-0", className)}
      >
        <ComboboxPrimitive.Input
          data-slot="entity-picker-input"
          className={cn(
            "w-full min-w-0 appearance-none rounded-md border border-border-strong bg-transparent leading-none font-medium text-ink transition-colors duration-instant ease-out-quick outline-none placeholder:font-normal placeholder:text-ink-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-negative",
            size === "sm"
              ? "h-9 py-[9px] pr-[52px] pl-[11px] text-[12px]"
              : "h-10 py-[11px] pr-[56px] pl-[13px] text-[12.5px]",
            focusRing.md
          )}
          placeholder={placeholder}
          {...(id === undefined ? {} : { id })}
          {...(label === undefined ? {} : { "aria-label": label })}
          {...(describedBy === undefined
            ? {}
            : { "aria-describedby": describedBy })}
          {...(invalid ? { "aria-invalid": true } : {})}
        />
        {value === null || disabled ? null : (
          <ComboboxPrimitive.Clear
            data-slot="entity-picker-clear"
            aria-label={PICKER_CLEAR}
            className={cn(
              "absolute top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-chip text-ink-3 outline-none after:absolute after:-inset-[11px] after:content-[''] hover:text-ink",
              size === "sm" ? "right-[26px]" : "right-[30px]",
              focusRing.chip
            )}
          >
            <XIcon className="pointer-events-none size-3" />
          </ComboboxPrimitive.Clear>
        )}
        <ComboboxPrimitive.Trigger
          data-slot="entity-picker-trigger"
          aria-label={PICKER_OPEN}
          tabIndex={-1}
          disabled={disabled}
          className={cn(
            "absolute top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-ink-3 outline-none",
            size === "sm" ? "right-[6px]" : "right-[9px]"
          )}
        >
          <ChevronDownIcon className="pointer-events-none size-3" />
        </ComboboxPrimitive.Trigger>
      </ComboboxPrimitive.InputGroup>

      <ComboboxContent className="min-w-(--anchor-width) border border-border-strong bg-surface p-0 shadow-popover ring-0">
        <ComboboxEmpty className="px-3 py-[13px] text-[12px] leading-[1.5] text-ink-3">
          {search?.pending === true ? PICKER_SEARCHING : emptyLabel}
        </ComboboxEmpty>
        <ComboboxList className="max-h-[268px] p-1">
          {grouped
            ? (group: PickerGroup) => (
                <ComboboxGroup key={group.value} items={group.items}>
                  {group.label === "" ? null : (
                    <ComboboxLabel className="px-2 pt-[9px] pb-[5px] text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
                      {group.label}
                    </ComboboxLabel>
                  )}
                  <ComboboxCollection>
                    {(option: PickerOption) => (
                      <ComboboxItem
                        key={option.value}
                        value={option}
                        className={itemClass}
                      >
                        <OptionRow option={option} />
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxGroup>
              )
            : (option: PickerOption) => (
                <ComboboxItem
                  key={option.value}
                  value={option}
                  className={itemClass}
                >
                  <OptionRow option={option} />
                </ComboboxItem>
              )}
        </ComboboxList>
        <div className="flex items-center gap-3 border-t border-border bg-surface-2 px-3 py-[7px]">
          <ComboboxPrimitive.Status
            data-slot="entity-picker-status"
            className="min-w-0 flex-1 truncate text-[10.5px] leading-[1.4] text-ink-3"
          >
            {pickerStatusLine(matchCount, search)}
          </ComboboxPrimitive.Status>
          {search?.hasMore === true ? (
            <button
              type="button"
              data-slot="entity-picker-more"
              onClick={search.onLoadMore}
              className={cn(
                "rounded-sm px-2 py-1 text-[10.5px] leading-none font-semibold text-brand outline-none",
                focusRing.sm
              )}
            >
              {PICKER_LOAD_MORE}
            </button>
          ) : null}
        </div>
      </ComboboxContent>
    </ComboboxPrimitive.Root>
  )
}
