import { useEffect, useMemo, useRef } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { Command as CommandPrimitive } from "cmdk"
import { Search, Sparkle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Truncate } from "@/components/primitives"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandList,
} from "@/components/ui/command"
import { KEYBOARD_ONLY } from "@/components/layout/breakpoints"
import {
  DESTINATIONS,
  destinationFor,
  type NavDestination,
} from "@/components/layout/navigation"

import { usePaletteStore } from "./palette-store"
import type {
  PaletteItem,
  PaletteJump,
  PaletteSection,
} from "./palette-sources"
import {
  matchesQuery,
  useAccountSection,
  useSettingsSection,
} from "./palette-sources"
import { isQuestion } from "./question"

const GROUP_CLASS =
  "p-0 **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:pt-[11px] **:[[cmdk-group-heading]]:pb-[7px] **:[[cmdk-group-heading]]:text-[9.5px] **:[[cmdk-group-heading]]:leading-none **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:tracking-[0.11em] **:[[cmdk-group-heading]]:text-ink-3 **:[[cmdk-group-heading]]:uppercase"

const ITEM_CLASS =
  "flex cursor-pointer items-center gap-[11px] rounded-button px-2.5 py-[9px] outline-none select-none data-[selected=true]:bg-surface-2"

const KEY_BADGE =
  "flex-none rounded-chip border border-border px-[5px] py-1 font-mono text-[10px] leading-none font-medium text-ink-3"

function PaletteRow({ item }: { item: PaletteItem }) {
  return (
    <CommandPrimitive.Item
      value={item.id}
      onSelect={item.onSelect}
      className={ITEM_CLASS}
    >
      <span className="w-5 flex-none text-center font-mono text-[12px] leading-none font-medium text-ink-3">
        {item.glyph}
      </span>
      <span className="min-w-0 flex-1">
        <Truncate
          text={item.title}
          className="block text-[12.5px] leading-[1.3] font-medium"
        />
        {item.meta ? (
          <Truncate
            text={item.meta}
            className="block text-[11px] leading-[1.4] text-ink-3"
          />
        ) : null}
      </span>
      {item.value ? (
        <span
          data-figure
          className="flex-none font-mono text-[12.5px] leading-none font-medium whitespace-nowrap"
        >
          {item.value}
        </span>
      ) : null}
      {item.keyHint ? (
        <span
          className={cn(
            KEYBOARD_ONLY,
            "flex-none border-0 px-0 font-mono text-[10px] leading-none font-medium text-ink-3"
          )}
        >
          {item.keyHint}
        </span>
      ) : null}
    </CommandPrimitive.Item>
  )
}

export function CommandPalette() {
  const open = usePaletteStore((state) => state.open)
  const query = usePaletteStore((state) => state.query)
  const contextDismissed = usePaletteStore((state) => state.contextDismissed)
  const setOpen = usePaletteStore((state) => state.setOpen)
  const setQuery = usePaletteStore((state) => state.setQuery)
  const closePalette = usePaletteStore((state) => state.closePalette)
  const dismissContext = usePaletteStore((state) => state.dismissContext)
  const togglePalette = usePaletteStore((state) => state.togglePalette)

  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.key.toLowerCase() !== "k") return
      if (!event.metaKey && !event.ctrlKey) return
      event.preventDefault()
      togglePalette()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [togglePalette])

  const jump = useMemo<PaletteJump>(
    () => ({
      toAccount: (accountId) => {
        closePalette()
        void navigate({ to: "/accounts/$accountId", params: { accountId } })
      },
      toSettingsSection: (section) => {
        closePalette()
        void navigate({ to: "/settings", search: { section } })
      },
    }),
    [closePalette, navigate]
  )

  const currentPage = destinationFor(pathname)
  const context = contextDismissed ? undefined : currentPage
  const ask = isQuestion(query)

  const goTo = useMemo(
    () =>
      DESTINATIONS.filter((destination) =>
        matchesQuery(query, [
          destination.title,
          destination.label,
          destination.eyebrow,
          destination.description,
        ])
      ).map<PaletteItem>((destination: NavDestination) => ({
        id: `go-to:${destination.id}`,
        title: destination.title,
        meta: destination.description,
        glyph: "→",
        onSelect: () => {
          closePalette()
          void navigate(destination.link)
        },
      })),
    [query, closePalette, navigate]
  )

  const accountSection = useAccountSection(query, open, jump)
  const settingsSection = useSettingsSection(query, jump)
  const extraSections = [accountSection, settingsSection].filter(
    (section): section is PaletteSection =>
      section !== null && section.items.length > 0
  )

  const askQuestion = () => {
    const question = query.trim()
    if (question.length === 0) return
    closePalette()
    void navigate({
      to: "/ai-chat",
      search: {
        ask: question,
        ...(context ? { context: context.title } : {}),
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        initialFocus={inputRef}
        className="top-16 w-[calc(100%-2rem)] translate-y-0 gap-0 overflow-hidden border border-border-strong bg-surface p-0 shadow-palette ring-0 sm:w-[660px] sm:max-w-[calc(100%-2rem)]"
      >
        <DialogTitle className="sr-only">Search or ask Myra</DialogTitle>
        <DialogDescription className="sr-only">
          Type a page to jump to it, or a question to ask Myra.
        </DialogDescription>
        <Command shouldFilter={false} loop className="bg-transparent p-0">
          <div className="flex items-center gap-[11px] border-b border-border px-4 py-[15px]">
            <Search
              className="size-[15px] flex-none text-ink-3"
              strokeWidth={2}
              aria-hidden
            />
            {context ? (
              <button
                type="button"
                onClick={dismissContext}
                className="flex flex-none items-center gap-[7px] rounded-sm bg-brand-dim px-2 py-[5px] whitespace-nowrap"
              >
                <span className="text-[10.5px] leading-none font-medium text-ink-3">
                  on
                </span>
                <span className="text-[11px] leading-none font-semibold text-brand">
                  {context.title}
                </span>
                <span
                  aria-hidden
                  className="text-[10px] leading-none text-brand"
                >
                  ✕
                </span>
                <span className="sr-only">Remove page context</span>
              </button>
            ) : null}
            <CommandPrimitive.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="Search or ask Myra…"
              className="min-w-0 flex-1 bg-transparent text-[14px] leading-none caret-brand outline-none placeholder:text-ink-3"
            />
            <span className={cn(KEYBOARD_ONLY, KEY_BADGE)}>esc</span>
          </div>

          <CommandList className="max-h-[420px] px-1.5 pt-1.5 pb-2">
            {ask ? (
              <CommandGroup
                className={cn(GROUP_CLASS, "-mx-1.5 -mt-1.5 mb-1.5")}
              >
                <CommandPrimitive.Item
                  value="ask-myra"
                  onSelect={askQuestion}
                  className="flex cursor-default items-start gap-3 border-b border-border bg-brand-dim px-4 py-[14px] outline-none select-none data-[selected=true]:bg-brand-dim"
                >
                  <Sparkle
                    className="mt-0.5 size-[15px] flex-none text-brand"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-[1.3] font-semibold">
                      Ask Myra
                    </span>
                    <span className="mt-[5px] block text-[11.5px] leading-[1.5] text-pretty text-ink-2">
                      {context
                        ? `Answered with ${context.title} as context.`
                        : "Answered from your ledger."}
                    </span>
                  </span>
                  <span
                    className={cn(
                      KEYBOARD_ONLY,
                      "flex-none rounded-chip border border-brand px-1.5 py-[5px] font-mono text-[10px] leading-none font-medium text-brand"
                    )}
                  >
                    ⏎
                  </span>
                </CommandPrimitive.Item>
              </CommandGroup>
            ) : null}

            {goTo.length > 0 ? (
              <CommandGroup heading="Go to" className={GROUP_CLASS}>
                {goTo.map((item) => (
                  <PaletteRow key={item.id} item={item} />
                ))}
              </CommandGroup>
            ) : null}

            {extraSections.map((section) => (
              <CommandGroup
                key={section.id}
                heading={section.label}
                className={GROUP_CLASS}
              >
                {section.items.map((item) => (
                  <PaletteRow key={item.id} item={item} />
                ))}
              </CommandGroup>
            ))}

            <CommandEmpty className="px-2.5 py-6 text-center text-[12px] leading-[1.5] text-ink-3">
              Nothing matches. End with a question mark to ask Myra instead.
            </CommandEmpty>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
