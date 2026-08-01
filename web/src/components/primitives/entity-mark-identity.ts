export type EntityMarkSize = "sm" | "md"

export const TILE_PALETTE = [
  "bg-chart-1/14 text-chart-1",
  "bg-chart-2/14 text-chart-2",
  "bg-chart-3/14 text-chart-3",
  "bg-chart-4/14 text-chart-4",
  "bg-chart-5/14 text-chart-5",
  "bg-chart-6/14 text-chart-6",
  "bg-chart-7/14 text-chart-7",
  "bg-chart-8/14 text-chart-8",
] as const

export const ENTITY_MARK_SLOTS = TILE_PALETTE.length

export const ENTITY_MARK_ROOT_SIZE: Record<EntityMarkSize, string> = {
  sm: "size-[19px] rounded-sm",
  md: "size-[24px] rounded-button",
}

export const ENTITY_MARK_TEXT_SIZE: Record<EntityMarkSize, string> = {
  sm: "text-[8.5px]",
  md: "text-[10px]",
}

export function entityMarkSlot(seed: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash % ENTITY_MARK_SLOTS
}

export function entityMonogram(label: string): string {
  const words = label
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word !== "")
  const first = words[0]
  if (first === undefined) return "?"
  if (words.length === 1) return first.slice(0, 2).toUpperCase()
  return `${first.slice(0, 1)}${(words[1] ?? "").slice(0, 1)}`.toUpperCase()
}
