/**
 * The server serialises every `rust_decimal` as a JSON *string* ("-42.50"), while the
 * generated client declares those fields `number`. The lie is silent: `<Figure>` parses a
 * string fine, so a single value looks right, but `a + b` concatenates and `a / b` is NaN.
 * Every wire decimal that a view derives anything from goes through here first.
 */
export function decimal(value: number | string | null | undefined): number {
  return decimalOrNull(value) ?? 0
}

export function decimalOrNull(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : null
}
