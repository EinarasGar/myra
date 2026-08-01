import type { KeyboardEvent, RefObject } from "react"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { FOCUS_RING_INSET, focusRing } from "./focus-ring"
import { GlyphIcon } from "./row-glyph"
import type { IconOption } from "./icon-picker-options"
import {
  CURATED_ICON_COUNT,
  ICON_GROUPS,
  ICON_PICKER_CLEAR,
  ICON_PICKER_EMPTY,
  ICON_PICKER_LIST_LABEL,
  ICON_PICKER_PLACEHOLDER,
  ICON_PICKER_SEARCH_PLACEHOLDER,
  iconGlyph,
  iconStatusLine,
  searchIcons,
} from "./icon-picker-options"

const FALLBACK_COLUMNS = 6

const BROWSE_STATUS = `${String(CURATED_ICON_COUNT)} icons · type to search all of Lucide`

type ListRow =
  | { readonly kind: "label"; readonly label: string }
  | {
      readonly kind: "icon"
      readonly option: IconOption
      readonly index: number
    }

function browseRows(): readonly ListRow[] {
  const rows: ListRow[] = []
  let index = 0
  for (const group of ICON_GROUPS) {
    rows.push({ kind: "label", label: group.label })
    for (const option of group.icons) {
      rows.push({ kind: "icon", option, index })
      index += 1
    }
  }
  return rows
}

const BROWSE_ROWS = browseRows()

const BROWSE_OPTIONS: readonly IconOption[] = ICON_GROUPS.flatMap(
  (group) => group.icons
)

function useGridColumns(grid: RefObject<HTMLDivElement | null>, open: boolean) {
  const [columns, setColumns] = useState(FALLBACK_COLUMNS)
  useEffect(() => {
    const element = grid.current
    if (element === null) return
    const measure = () => {
      const tracks = getComputedStyle(element)
        .gridTemplateColumns.split(" ")
        .filter((track) => track !== "" && track !== "none")
      setColumns(tracks.length === 0 ? FALLBACK_COLUMNS : tracks.length)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [grid, open])
  return columns
}

function IconPickerPopup({
  value,
  open,
  query,
  highlight,
  onQueryChange,
  onHighlightChange,
  onSelect,
}: {
  value: string | null
  open: boolean
  query: string
  highlight: number | null
  onQueryChange: (query: string) => void
  onHighlightChange: (highlight: number | null) => void
  onSelect: (name: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const revealActive = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ block: "nearest" })
  }, [])
  const gridRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const optionPrefix = useId()
  const columns = useGridColumns(gridRef, open)

  const searching = query.trim() !== ""
  const search = useMemo(() => searchIcons(query), [query])
  const searchRows = useMemo(
    () =>
      search.icons.map<ListRow>((option, index) => ({
        kind: "icon",
        option,
        index,
      })),
    [search.icons]
  )

  const rows = searching ? searchRows : BROWSE_ROWS
  const options = searching ? search.icons : BROWSE_OPTIONS
  const chosen = options.findIndex((option) => option.name === value)
  const clamped = Math.min(
    highlight ?? Math.max(chosen, 0),
    Math.max(options.length - 1, 0)
  )
  const activeName = options[clamped]?.name ?? null
  const activeId = activeName === null ? null : `${optionPrefix}${activeName}`

  function move(next: number) {
    onHighlightChange(Math.max(0, Math.min(next, options.length - 1)))
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const caret = event.currentTarget.selectionStart ?? 0
    const typed = event.currentTarget.value.length
    if (event.key === "ArrowDown") {
      event.preventDefault()
      move(clamped + columns)
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      move(clamped - columns)
      return
    }
    if (event.key === "ArrowRight" && caret === typed) {
      event.preventDefault()
      move(clamped + 1)
      return
    }
    if (event.key === "ArrowLeft" && caret === 0) {
      event.preventDefault()
      move(clamped - 1)
      return
    }
    if (event.key === "Home" && caret === 0) {
      event.preventDefault()
      move(0)
      return
    }
    if (event.key === "End" && caret === typed) {
      event.preventDefault()
      move(options.length - 1)
      return
    }
    if (event.key === "Enter" && activeName !== null) {
      event.preventDefault()
      onSelect(activeName)
    }
  }

  return (
    <PopoverContent
      align="start"
      sideOffset={6}
      initialFocus={inputRef}
      data-slot="icon-picker-content"
      className="w-(--anchor-width) max-w-[calc(100vw-1.5rem)] min-w-[248px] gap-0 rounded-md border border-border-strong bg-surface p-0 shadow-popover ring-0"
    >
      <div className="flex items-center gap-[9px] border-b border-border bg-surface-2 px-4 py-[11px]">
        <SearchIcon className="size-[13px] flex-none text-ink-3" />
        <Input
          ref={inputRef}
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ICON_PICKER_SEARCH_PLACEHOLDER}
          {...(activeId === null ? {} : { "aria-activedescendant": activeId })}
          value={query}
          placeholder={ICON_PICKER_SEARCH_PLACEHOLDER}
          onChange={(event) => {
            onQueryChange(event.target.value)
            onHighlightChange(null)
          }}
          onKeyDown={onSearchKeyDown}
          className={cn(
            "h-auto rounded-chip border-0 px-0 py-0 text-[12.5px] font-normal",
            FOCUS_RING_INSET
          )}
        />
      </div>
      {options.length === 0 ? (
        <p className="px-4 py-[13px] text-[12px] leading-[1.5] text-ink-3">
          {ICON_PICKER_EMPTY}
        </p>
      ) : (
        <div
          ref={gridRef}
          id={listId}
          role="listbox"
          aria-label={ICON_PICKER_LIST_LABEL}
          className="grid max-h-[236px] grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1 overflow-y-auto p-2"
        >
          {rows.map((row) =>
            row.kind === "label" ? (
              <p
                key={`label-${row.label}`}
                className="col-span-full px-1 pt-[9px] pb-[5px] text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase"
              >
                {row.label}
              </p>
            ) : (
              <div
                key={row.option.name}
                id={`${optionPrefix}${row.option.name}`}
                {...(row.index === clamped ? { ref: revealActive } : {})}
                role="option"
                aria-label={row.option.name}
                aria-selected={row.option.name === value}
                data-slot="icon-picker-option"
                {...(row.index === clamped ? { "data-active": "" } : {})}
                onClick={() => {
                  onSelect(row.option.name)
                }}
                onPointerMove={() => {
                  onHighlightChange(row.index)
                }}
                className={cn(
                  "flex aspect-square cursor-default items-center justify-center rounded-sm border transition-colors duration-instant ease-out-quick",
                  row.option.name === value
                    ? "border-brand bg-brand-dim text-brand"
                    : "border-transparent text-ink-2",
                  row.index === clamped &&
                    row.option.name !== value &&
                    "bg-surface-2 text-ink"
                )}
              >
                <GlyphIcon icon={row.option.icon} className="size-4" />
              </div>
            )
          )}
        </div>
      )}
      <p
        data-slot="icon-picker-status"
        className="border-t border-border bg-surface-2 px-3 py-[7px] text-[10.5px] leading-[1.4] text-ink-3"
      >
        {searching
          ? iconStatusLine(search.icons.length, search.total)
          : BROWSE_STATUS}
      </p>
    </PopoverContent>
  )
}

interface IconPickerProps {
  value: string | null
  onValueChange: (value: string | null) => void
  id?: string
  label?: string
  describedBy?: string
  invalid?: boolean
  disabled?: boolean
  clearable?: boolean
  placeholder?: string
  className?: string
}

export function IconPicker({
  value,
  onValueChange,
  id,
  label,
  describedBy,
  invalid = false,
  disabled = false,
  clearable = false,
  placeholder = ICON_PICKER_PLACEHOLDER,
  className,
}: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState<number | null>(null)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) return
        setQuery("")
        setHighlight(null)
      }}
    >
      <div
        data-slot="icon-picker"
        className={cn("relative w-full min-w-0", className)}
      >
        <PopoverTrigger
          data-slot="icon-picker-trigger"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full min-w-0 items-center gap-[9px] rounded-md border border-border-strong bg-transparent py-[11px] pl-[13px] text-[12.5px] leading-none font-medium text-ink transition-colors duration-instant ease-out-quick outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-negative",
            clearable && value !== null ? "pr-[34px]" : "pr-[13px]",
            focusRing.md
          )}
          {...(id === undefined ? {} : { id })}
          {...(label === undefined ? {} : { "aria-label": label })}
          {...(describedBy === undefined
            ? {}
            : { "aria-describedby": describedBy })}
          {...(invalid ? { "aria-invalid": true } : {})}
        >
          {value === null ? null : (
            <GlyphIcon
              icon={iconGlyph(value)}
              className="flex-none text-ink-3"
            />
          )}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left",
              value === null && "font-normal text-ink-3"
            )}
          >
            {value ?? placeholder}
          </span>
          <ChevronDownIcon className="size-3 flex-none text-ink-3" />
        </PopoverTrigger>
        {clearable && value !== null && !disabled ? (
          <button
            type="button"
            data-slot="icon-picker-clear"
            aria-label={ICON_PICKER_CLEAR}
            onClick={() => {
              onValueChange(null)
            }}
            className={cn(
              "absolute top-1/2 right-[30px] flex size-5 -translate-y-1/2 items-center justify-center rounded-chip text-ink-3 outline-none hover:text-ink",
              focusRing.chip
            )}
          >
            <XIcon className="pointer-events-none size-3" />
          </button>
        ) : null}
      </div>

      <IconPickerPopup
        value={value}
        open={open}
        query={query}
        highlight={highlight}
        onQueryChange={setQuery}
        onHighlightChange={setHighlight}
        onSelect={(name) => {
          onValueChange(name)
          setOpen(false)
          setQuery("")
          setHighlight(null)
        }}
      />
    </Popover>
  )
}
