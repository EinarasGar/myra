import { DEFAULT_LOCALE } from "./locale"
import { numberFormat } from "./number"

export type CurrencyDisplay = "narrowSymbol" | "symbol" | "code" | "name"

const CURRENCY_CODE = /^[A-Za-z]{3}$/

export function isCurrencyCode(code: unknown): code is string {
  return typeof code === "string" && CURRENCY_CODE.test(code.trim())
}

export function normaliseCurrencyCode(code: string): string {
  return code.trim().toUpperCase()
}

export function currencySymbol(
  code: string,
  options: { locale?: string; currencyDisplay?: CurrencyDisplay } = {}
): string {
  const currency = normaliseCurrencyCode(code)
  if (!CURRENCY_CODE.test(currency)) return code.trim()
  const parts = numberFormat(options.locale ?? DEFAULT_LOCALE, {
    style: "currency",
    currency,
    currencyDisplay: options.currencyDisplay ?? "narrowSymbol",
  }).formatToParts(0)
  return parts.find((part) => part.type === "currency")?.value ?? currency
}
