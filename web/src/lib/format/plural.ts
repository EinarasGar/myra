import { DEFAULT_LOCALE } from "./locale"
import { numberFormat } from "./number"

export function formatCount(count: number): string {
  return numberFormat(DEFAULT_LOCALE, {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(count)
}

export function pluralise(
  count: number,
  singular: string,
  plural?: string
): string {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}

export function countOf(
  count: number,
  singular: string,
  plural?: string
): string {
  return `${formatCount(count)} ${pluralise(count, singular, plural)}`
}
