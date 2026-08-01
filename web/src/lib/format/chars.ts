export const MINUS = "−"
export const EM_DASH = "—"
export const NBSP = String.fromCharCode(0x00a0)
export const ARROW_UP = "▲"
export const ARROW_DOWN = "▼"

const HYPHEN_LIKE = /[-‐‑‒–⁃➖]/g

export function toTrueMinus(text: string): string {
  return text.replace(HYPHEN_LIKE, MINUS)
}
