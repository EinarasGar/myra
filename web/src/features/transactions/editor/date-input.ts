import { format, isValid, parse, startOfDay, subDays } from "date-fns"

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const

const NUMERIC_FORMATS = [
  "yyyy-MM-dd",
  "dd/MM/yyyy",
  "d MMM yyyy",
  "d MMMM yyyy",
]

export const DATE_DISPLAY_FORMAT = "d MMM yyyy"

export interface ParsedEditorDate {
  readonly date: number | null
  readonly label: string | null
}

function toSeconds(value: Date): number {
  return Math.floor(startOfDay(value).getTime() / 1000)
}

export function formatEditorDate(seconds: number): string {
  return format(new Date(seconds * 1000), DATE_DISPLAY_FORMAT)
}

function resolvedTo(value: Date): ParsedEditorDate {
  return { date: toSeconds(value), label: format(value, DATE_DISPLAY_FORMAT) }
}

function relativeWeekday(text: string, now: Date): Date | null {
  const match = /^(?:last\s+)?([a-z]+)$/.exec(text)
  const name = match?.[1]
  if (name === undefined) return null
  const index = WEEKDAYS.indexOf(name as (typeof WEEKDAYS)[number])
  if (index === -1) return null
  const back = (now.getDay() - index + 7) % 7
  return subDays(now, back === 0 ? 7 : back)
}

/**
 * The field accepts what the frame promises — "plain English works" — and refuses the
 * rest out loud rather than silently keeping yesterday's date.
 */
export function parseEditorDate(input: string, now: Date): ParsedEditorDate {
  const text = input.trim().toLowerCase()
  if (text === "") return { date: null, label: null }

  if (text === "today") return resolvedTo(now)
  if (text === "yesterday") return resolvedTo(subDays(now, 1))

  const daysAgo = /^(\d+)\s+days?\s+ago$/.exec(text)
  if (daysAgo?.[1] !== undefined) {
    return resolvedTo(subDays(now, Number(daysAgo[1])))
  }

  const weekday = relativeWeekday(text, now)
  if (weekday !== null) return resolvedTo(weekday)

  for (const pattern of NUMERIC_FORMATS) {
    const parsed = parse(input.trim(), pattern, now)
    if (isValid(parsed)) return resolvedTo(parsed)
  }

  return { date: null, label: null }
}
