import { EM_DASH } from "./chars"
import { DEFAULT_LOCALE } from "./locale"

export type DateInput = Date | string | number | null | undefined

type YearDisplay = "auto" | "always" | "never"

const dateFormatCache = new Map<string, Intl.DateTimeFormat>()

function dateFormat(
  locale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  const cached = dateFormatCache.get(key)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat(locale, options)
  dateFormatCache.set(key, formatter)
  return formatter
}

export function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export interface StampOptions {
  locale?: string
  timeZone?: string
}

export interface DateStampOptions extends StampOptions {
  year?: YearDisplay
  now?: Date
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dayDifference(date: Date, now: Date): number {
  const day = 24 * 60 * 60 * 1000
  return Math.round((startOfDay(now) - startOfDay(date)) / day)
}

export function formatDateStamp(
  value: DateInput,
  options: DateStampOptions = {}
): string {
  const date = toDate(value)
  if (!date) return EM_DASH
  const now = options.now ?? new Date()
  const year = options.year ?? "auto"
  const showYear =
    year === "always" ||
    (year === "auto" && date.getFullYear() !== now.getFullYear())
  return dateFormat(options.locale ?? DEFAULT_LOCALE, {
    day: "numeric",
    month: "short",
    ...(showYear ? { year: "numeric" as const } : {}),
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date)
}

export function formatTimeStamp(
  value: DateInput,
  options: StampOptions = {}
): string {
  const date = toDate(value)
  if (!date) return EM_DASH
  return dateFormat(options.locale ?? DEFAULT_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date)
}

export function formatDateTimeStamp(
  value: DateInput,
  options: DateStampOptions = {}
): string {
  const date = toDate(value)
  if (!date) return EM_DASH
  return `${formatDateStamp(date, options)} · ${formatTimeStamp(date, options)}`
}

export function formatMonthStamp(
  value: DateInput,
  options: StampOptions = {}
): string {
  const date = toDate(value)
  if (!date) return EM_DASH
  return dateFormat(options.locale ?? DEFAULT_LOCALE, {
    month: "short",
    year: "2-digit",
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date)
}

export function formatDayLabel(
  value: DateInput,
  options: DateStampOptions = {}
): string {
  const date = toDate(value)
  if (!date) return EM_DASH
  const difference = dayDifference(date, options.now ?? new Date())
  if (difference === 0) return "Today"
  if (difference === 1) return "Yesterday"
  if (difference > 1 && difference < 7) {
    return dateFormat(options.locale ?? DEFAULT_LOCALE, {
      weekday: "long",
      ...(options.timeZone ? { timeZone: options.timeZone } : {}),
    }).format(date)
  }
  return formatDateStamp(date, options)
}
