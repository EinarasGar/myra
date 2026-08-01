import { EM_DASH, NBSP } from "./chars"
import {
  isCurrencyCode,
  normaliseCurrencyCode,
  type CurrencyDisplay,
} from "./currency"
import { DEFAULT_LOCALE } from "./locale"
import {
  appendUnitSuffix,
  applySign,
  compactUnit,
  formatFixed,
  numberFormat,
  roundedDirection,
  type Direction,
  type SignDisplay,
} from "./number"

export type FigureKind = "money" | "units" | "percent" | "rate" | "plain"
export type FigureValue = number | string | null | undefined
export type PercentScale = "percent" | "ratio"

const MONEY_FRACTION_DIGITS = 2
const UNIT_FRACTION_DIGITS = 4
const PERCENT_FRACTION_DIGITS = 1
const RATE_MIN_FRACTION_DIGITS = 2
const RATE_MAX_FRACTION_DIGITS = 10

export function toFigureNumber(value: FigureValue): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const text = value.trim()
  if (text === "") return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

export function quotedFractionDigits(value: FigureValue): number {
  const numeric = toFigureNumber(value)
  if (numeric === null) return RATE_MIN_FRACTION_DIGITS
  const text = typeof value === "string" ? value.trim() : String(numeric)
  const exponent = /e([+-]?\d+)/i.exec(text)
  const mantissa = exponent ? text.slice(0, exponent.index) : text
  const fraction = mantissa.split(".")[1]?.length ?? 0
  const digits = exponent ? fraction - Number(exponent[1]) : fraction
  return Math.min(
    Math.max(digits, RATE_MIN_FRACTION_DIGITS),
    RATE_MAX_FRACTION_DIGITS
  )
}

function appendTicker(body: string, ticker: string | null | undefined): string {
  const text = ticker?.trim()
  return text ? `${body}${NBSP}${text}` : body
}

function currencyIntlOptions(
  currency: string,
  currencyDisplay: CurrencyDisplay | undefined
): Intl.NumberFormatOptions {
  return {
    style: "currency",
    currency: normaliseCurrencyCode(currency),
    currencyDisplay: currencyDisplay ?? "narrowSymbol",
  }
}

export const MISSING_MONEY_CURRENCY =
  "A money figure needs a currency. Pass `currency`, or render it where the session base currency is available."

export interface MoneyFormatOptions {
  currency: string
  currencyDisplay?: CurrencyDisplay
  locale?: string
  sign?: SignDisplay
  decimals?: number
  compact?: boolean
}

export function formatMoney(
  value: FigureValue,
  options: MoneyFormatOptions
): string {
  const numeric = toFigureNumber(value)
  if (numeric === null) return EM_DASH

  const currency = options.currency?.trim() ?? ""
  if (currency === "") throw new Error(MISSING_MONEY_CURRENCY)
  if (options.compact) return formatCompact(numeric, { ...options, currency })

  const digits = options.decimals ?? MONEY_FRACTION_DIGITS
  if (isCurrencyCode(currency)) {
    return formatFixed(numeric, {
      digits,
      locale: options.locale,
      sign: options.sign,
      intl: currencyIntlOptions(currency, options.currencyDisplay),
    })
  }
  return appendTicker(
    formatFixed(numeric, {
      digits,
      locale: options.locale,
      sign: options.sign,
    }),
    currency
  )
}

export interface UnitsFormatOptions {
  ticker?: string | null
  locale?: string
  sign?: SignDisplay
  decimals?: number
  compact?: boolean
}

export function formatUnits(
  value: FigureValue,
  options: UnitsFormatOptions = {}
): string {
  const numeric = toFigureNumber(value)
  if (numeric === null) return EM_DASH
  if (options.compact) {
    return formatCompact(numeric, { ...options, currency: options.ticker })
  }
  return appendTicker(
    formatFixed(numeric, {
      digits: options.decimals ?? UNIT_FRACTION_DIGITS,
      locale: options.locale,
      sign: options.sign,
    }),
    options.ticker
  )
}

export interface PercentFormatOptions {
  scale?: PercentScale
  locale?: string
  sign?: SignDisplay
  decimals?: number
}

export function formatPercent(
  value: FigureValue,
  options: PercentFormatOptions = {}
): string {
  const numeric = toFigureNumber(value)
  if (numeric === null) return EM_DASH
  const percent = options.scale === "ratio" ? numeric * 100 : numeric
  return formatFixed(percent, {
    digits: options.decimals ?? PERCENT_FRACTION_DIGITS,
    locale: options.locale,
    sign: options.sign,
    magnitudeScale: 0.01,
    intl: { style: "percent" },
  })
}

export interface RateFormatOptions {
  locale?: string
  sign?: SignDisplay
  decimals?: number
}

export function formatRate(
  value: FigureValue,
  options: RateFormatOptions = {}
): string {
  const numeric = toFigureNumber(value)
  if (numeric === null) return EM_DASH
  return formatFixed(numeric, {
    digits: options.decimals ?? quotedFractionDigits(value),
    locale: options.locale,
    sign: options.sign,
  })
}

export interface PlainFormatOptions {
  locale?: string
  sign?: SignDisplay
  decimals?: number
  compact?: boolean
}

export function formatPlain(
  value: FigureValue,
  options: PlainFormatOptions = {}
): string {
  const numeric = toFigureNumber(value)
  if (numeric === null) return EM_DASH
  if (options.compact) return formatCompact(numeric, options)
  return formatFixed(numeric, {
    digits: options.decimals ?? 0,
    locale: options.locale,
    sign: options.sign,
  })
}

export interface CompactFormatOptions {
  currency?: string | null
  currencyDisplay?: CurrencyDisplay
  locale?: string
  sign?: SignDisplay
}

export function formatCompact(
  value: FigureValue,
  options: CompactFormatOptions = {}
): string {
  const numeric = toFigureNumber(value)
  if (numeric === null) return EM_DASH

  const { divisor, suffix, digits } = compactUnit(numeric)
  const currency = options.currency?.trim()
  const intl = isCurrencyCode(currency)
    ? currencyIntlOptions(currency, options.currencyDisplay)
    : {}
  const parts = numberFormat(options.locale ?? DEFAULT_LOCALE, {
    ...intl,
    signDisplay: "never",
    useGrouping: true,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).formatToParts(Math.abs(numeric) / divisor)

  const body = applySign(
    appendUnitSuffix(parts, suffix),
    roundedDirection(numeric / divisor, digits),
    options.sign
  )
  return isCurrencyCode(currency) ? body : appendTicker(body, currency)
}

export type FigureFormatOptions =
  | ({ kind: "money" } & MoneyFormatOptions)
  | ({ kind: "units" } & UnitsFormatOptions)
  | ({ kind: "percent" } & PercentFormatOptions)
  | ({ kind: "rate" } & RateFormatOptions)
  | ({ kind: "plain" } & PlainFormatOptions)

function effectiveFractionDigits(
  value: FigureValue,
  kind: FigureKind,
  decimals: number | undefined
): number {
  if (decimals !== undefined) return decimals
  switch (kind) {
    case "units":
      return UNIT_FRACTION_DIGITS
    case "percent":
      return PERCENT_FRACTION_DIGITS
    case "rate":
      return quotedFractionDigits(value)
    case "plain":
      return 0
    default:
      return MONEY_FRACTION_DIGITS
  }
}

export function figureDirection(
  value: FigureValue,
  options: FigureFormatOptions
): Direction {
  const numeric = toFigureNumber(value)
  if (numeric === null) return 0

  if (
    options.kind !== "percent" &&
    options.kind !== "rate" &&
    options.compact
  ) {
    const { divisor, digits } = compactUnit(numeric)
    return roundedDirection(numeric / divisor, digits)
  }

  const scaled =
    options.kind === "percent" && options.scale === "ratio"
      ? numeric * 100
      : numeric
  return roundedDirection(
    scaled,
    effectiveFractionDigits(value, options.kind, options.decimals)
  )
}

export function formatFigure(
  value: FigureValue,
  options: FigureFormatOptions
): string {
  switch (options.kind) {
    case "units":
      return formatUnits(value, options)
    case "percent":
      return formatPercent(value, options)
    case "rate":
      return formatRate(value, options)
    case "plain":
      return formatPlain(value, options)
    case "money":
      return formatMoney(value, options)
  }
}
