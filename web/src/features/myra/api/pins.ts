import type { AnswerCard } from "./answers"

export interface PinComparison {
  readonly difference: number | null
  readonly currency: string | null
}

const MAX_PINS = 2

export function comparablePins(pins: readonly AnswerCard[]): PinComparison {
  if (pins.length !== 2) return { difference: null, currency: null }
  const a = pins[0]?.headline
  const b = pins[1]?.headline
  if (
    a === undefined ||
    b === undefined ||
    a === null ||
    b === null ||
    a.kind !== "money" ||
    b.kind !== "money" ||
    a.currency === undefined ||
    a.currency !== b.currency ||
    a.value === null ||
    b.value === null
  ) {
    return { difference: null, currency: null }
  }
  return { difference: b.value - a.value, currency: a.currency }
}

export function togglePin(
  pins: readonly AnswerCard[],
  card: AnswerCard
): readonly AnswerCard[] {
  if (pins.some((pin) => pin.id === card.id)) {
    return pins.filter((pin) => pin.id !== card.id)
  }
  return [...pins, card].slice(-MAX_PINS)
}
