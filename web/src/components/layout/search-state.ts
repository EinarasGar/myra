import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import type { ChartPeriod } from "@/components/chart/periods"
import { DEFAULT_CHART_PERIOD, isChartPeriod } from "@/components/chart/periods"

interface Sync {
  url: string | undefined
  asked: { readonly url: string | undefined } | null
}

/** A hand-typed digit-only param parses as a number, and it still names the same row. */
function searchText(raw: unknown): string | undefined {
  if (typeof raw === "string") return raw
  if (typeof raw === "number") return String(raw)
  return undefined
}

/**
 * A view control the URL owns, so reloading or sharing a link shows the same thing.
 *
 * Writes replace rather than push: these are adjustments to what is on screen, not places
 * to come back to, and Back should leave the page rather than walk every period a user
 * tried.
 *
 * What renders is the local copy, and the URL is written alongside it. The router commits
 * a navigation outside React's transition, so reading the URL back directly would drop any
 * suspending panel below this to its skeleton for the length of the round trip. Changes
 * that came from elsewhere — Back, Forward, a pasted link — are adopted from the URL, which
 * is why the write we asked for is remembered: without it the round trip looks like an
 * outside change and undoes itself before it lands.
 *
 * `read` and `write` must be module-level so the value keeps its identity across renders; a
 * `read` that rebuilds a Set on every call would defeat every memo below it.
 */
export function useSearchState<T>(
  key: string,
  read: (raw: string | undefined) => T,
  write: (value: T) => string | undefined
): readonly [T, (next: T) => void] {
  const navigate = useNavigate()
  const raw = useSearch({
    strict: false,
    select: (search) => (search as Record<string, unknown>)[key],
  })
  const inUrl = searchText(raw)
  const fromUrl = useMemo(() => read(inUrl), [read, inUrl])
  const [value, setValue] = useState<T>(fromUrl)
  const sync = useRef<Sync>({ url: inUrl, asked: null })

  useEffect(() => {
    const state = sync.current
    if (state.url === inUrl) return
    state.url = inUrl
    const ours = state.asked !== null && state.asked.url === inUrl
    state.asked = null
    if (ours) return
    startTransition(() => {
      setValue(fromUrl)
    })
  }, [inUrl, fromUrl])

  const set = useCallback(
    (next: T) => {
      const asked = write(next)
      sync.current.asked = { url: asked }
      setValue(next)
      void navigate({
        to: ".",
        search: (previous: Record<string, unknown>) => ({
          ...previous,
          [key]: asked,
        }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate, key, write]
  )

  return [value, set] as const
}

function readPeriod(raw: string | undefined): ChartPeriod {
  return isChartPeriod(raw) ? raw : DEFAULT_CHART_PERIOD
}

function writePeriod(period: ChartPeriod): string | undefined {
  return period === DEFAULT_CHART_PERIOD ? undefined : period
}

export function usePeriodSearch(): readonly [
  ChartPeriod,
  (next: ChartPeriod) => void,
] {
  return useSearchState("period", readPeriod, writePeriod)
}

export function readFlag(raw: string | undefined): boolean {
  return raw === "on"
}

export function writeFlag(value: boolean): string | undefined {
  return value ? "on" : undefined
}

export function readKeySet(raw: string | undefined): ReadonlySet<string> {
  if (raw === undefined) return new Set()
  return new Set(raw.split(",").filter((key) => key !== ""))
}

export function writeKeySet(keys: ReadonlySet<string>): string | undefined {
  return keys.size === 0 ? undefined : [...keys].join(",")
}
