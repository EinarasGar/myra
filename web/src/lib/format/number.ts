import { MINUS, toTrueMinus } from "./chars"
import { DEFAULT_LOCALE } from "./locale"

export type SignDisplay = "auto" | "always" | "never"

export type Direction = -1 | 0 | 1

const MAX_FRACTION_DIGITS = 20

const numberFormatCache = new Map<string, Intl.NumberFormat>()

export function numberFormat(
  locale: string,
  options: Intl.NumberFormatOptions
): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  const cached = numberFormatCache.get(key)
  if (cached) return cached
  const formatter = new Intl.NumberFormat(locale, options)
  numberFormatCache.set(key, formatter)
  return formatter
}

export function clampFractionDigits(digits: number): number {
  if (!Number.isFinite(digits)) return 0
  return Math.min(Math.max(Math.trunc(digits), 0), MAX_FRACTION_DIGITS)
}

export function roundedDirection(value: number, digits: number): Direction {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** clampFractionDigits(digits)
  if (Math.round(Math.abs(value) * factor) === 0) return 0
  return value < 0 ? -1 : 1
}

export function rendersSignGlyph(
  direction: Direction,
  sign: SignDisplay = "auto"
): boolean {
  if (sign === "never") return false
  if (direction < 0) return true
  return direction > 0 && sign === "always"
}

export function applySign(
  body: string,
  direction: Direction,
  sign: SignDisplay = "auto"
): string {
  const text = toTrueMinus(body)
  if (!rendersSignGlyph(direction, sign)) return text
  return direction < 0 ? MINUS + text : `+${text}`
}

export interface FixedFormatSpec {
  digits: number
  locale?: string
  sign?: SignDisplay
  grouping?: boolean
  magnitudeScale?: number
  intl?: Intl.NumberFormatOptions
}

export function formatFixed(value: number, spec: FixedFormatSpec): string {
  const digits = clampFractionDigits(spec.digits)
  const direction = roundedDirection(value, digits)
  const magnitude = Math.abs(value) * (spec.magnitudeScale ?? 1)
  const body = numberFormat(spec.locale ?? DEFAULT_LOCALE, {
    ...spec.intl,
    signDisplay: "never",
    useGrouping: spec.grouping ?? true,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(magnitude)
  return applySign(body, direction, spec.sign)
}

export interface CompactUnit {
  divisor: number
  suffix: string
  digits: number
}

const COMPACT_UNITS = [
  { divisor: 1e12, suffix: "tn" },
  { divisor: 1e9, suffix: "bn" },
  { divisor: 1e6, suffix: "m" },
  { divisor: 1e3, suffix: "k" },
] as const

function unitDigits(scaled: number): number {
  return scaled < 10 ? 1 : 0
}

export function compactUnit(value: number): CompactUnit {
  const magnitude = Math.abs(value)
  const unit = COMPACT_UNITS.find((candidate) => magnitude >= candidate.divisor)
  if (!unit) return { divisor: 1, suffix: "", digits: 0 }

  const scaled = magnitude / unit.divisor
  const digits = unitDigits(scaled)
  const rounded = Math.round(scaled * 10 ** digits) / 10 ** digits
  if (rounded < 1000) {
    return { divisor: unit.divisor, suffix: unit.suffix, digits }
  }

  const promoted = COMPACT_UNITS.findLast(
    (candidate) => candidate.divisor > unit.divisor
  )
  if (!promoted) return { divisor: unit.divisor, suffix: unit.suffix, digits }
  return {
    divisor: promoted.divisor,
    suffix: promoted.suffix,
    digits: unitDigits(magnitude / promoted.divisor),
  }
}

const NUMERIC_PART_TYPES = new Set<Intl.NumberFormatPartTypes>([
  "integer",
  "group",
  "decimal",
  "fraction",
])

export function appendUnitSuffix(
  parts: Intl.NumberFormatPart[],
  suffix: string
): string {
  if (suffix === "") return parts.map((part) => part.value).join("")
  const last = parts.findLastIndex((part) => NUMERIC_PART_TYPES.has(part.type))
  return parts
    .map((part, index) => (index === last ? part.value + suffix : part.value))
    .join("")
}
