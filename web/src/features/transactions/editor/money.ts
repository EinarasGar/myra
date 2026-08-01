export type DecimalSeparator = "." | ","

const SPACES = /\s/g
const SIGNS = /^[+\-−]|[+\-−]$/g
const MONEY_CHARS = /^[\d.,]+$/
const DIGITS = /^\d*$/

export function localeDecimalSeparator(
  locale?: Intl.LocalesArgument
): DecimalSeparator {
  const decimal = new Intl.NumberFormat(locale)
    .formatToParts(1.1)
    .find((part) => part.type === "decimal")?.value
  return decimal === "," ? "," : "."
}

function ungrouped(integer: string, group: DecimalSeparator): string | null {
  if (!integer.includes(group)) return DIGITS.test(integer) ? integer : null
  const parts = integer.split(group)
  const [first, ...rest] = parts
  if (first === undefined || first === "" || first.length > 3) return null
  if (rest.some((part) => part.length !== 3)) return null
  return parts.every((part) => DIGITS.test(part)) ? parts.join("") : null
}

function decimalSeparatorOf(
  text: string,
  preferred: DecimalSeparator
): DecimalSeparator | null {
  const dots = text.split(".").length - 1
  const commas = text.split(",").length - 1
  if (dots > 0 && commas > 0) {
    return text.lastIndexOf(",") > text.lastIndexOf(".") ? "," : "."
  }
  if (dots !== 1 && commas !== 1) return null
  const only: DecimalSeparator = dots === 1 ? "." : ","
  const [before = "", after = ""] = text.split(only)
  const ambiguous = after.length === 3 && before !== ""
  if (!ambiguous) return only
  return preferred === only ? only : null
}

let runtimeSeparator: DecimalSeparator | null = null

function preferredSeparator(): DecimalSeparator {
  runtimeSeparator ??= localeDecimalSeparator()
  return runtimeSeparator
}

/**
 * "1,50" is twelve-fifty across most of Europe and a hundred and fifty to a machine that
 * assumes a comma groups thousands, so the separator is decided per string: with both
 * separators present the last one is the decimal, a lone separator with anything other than
 * three digits behind it is a decimal point whatever the locale, and only the genuinely
 * ambiguous "1,500" is settled by the reader's locale. Anything else is not a number.
 */
export function parseMoney(
  input: string,
  preferred: DecimalSeparator = preferredSeparator()
): number | null {
  const text = input.replace(SPACES, "").replace(SIGNS, "")
  if (text === "" || !MONEY_CHARS.test(text)) return null

  const decimal = decimalSeparatorOf(text, preferred)
  const cut = decimal === null ? -1 : text.lastIndexOf(decimal)
  const integerText = cut === -1 ? text : text.slice(0, cut)
  const fraction = cut === -1 ? "" : text.slice(cut + 1)
  if (!DIGITS.test(fraction)) return null

  const group: DecimalSeparator =
    decimal === null
      ? integerText.includes(",")
        ? ","
        : "."
      : decimal === ","
        ? "."
        : ","
  const integer = ungrouped(integerText, group)
  if (integer === null) return null
  if (integer === "" && fraction === "") return null

  const value = Number(`${integer === "" ? "0" : integer}.${fraction || "0"}`)
  return Number.isFinite(value) ? value : null
}

/**
 * A tiny holding of a token is a real amount, and `String(1e-7)` is not a number this field
 * can read back, so exponent notation is expanded rather than written into the draft.
 */
export function moneyText(value: number): string {
  const text = String(value)
  if (!text.includes("e")) return text
  const expanded = value.toFixed(20)
  if (expanded.includes("e")) return text
  return expanded.replace(/0+$/, "").replace(/\.$/, "")
}
