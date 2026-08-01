/**
 * `focus-visible:outline-solid` is load-bearing: Tailwind v4's `outline-none`/`outline-hidden`
 * set `--tw-outline-style: none`, which `outline-2` then reads back, so a ring declared without
 * an explicit style resolves to `outline-style: none` and never paints.
 */
const RING = "focus-visible:outline-solid focus-visible:outline-2"

export const FOCUS_RING = `${RING} focus-visible:outline-brand focus-visible:outline-offset-2`

export const FOCUS_RING_INSET = `${RING} focus-visible:outline-brand focus-visible:-outline-offset-2`

export const focusRing = {
  chip: `${FOCUS_RING} rounded-chip`,
  sm: `${FOCUS_RING} rounded-sm`,
  button: `${FOCUS_RING} rounded-button`,
  md: `${FOCUS_RING} rounded-md`,
  panel: `${FOCUS_RING} rounded-panel`,
  sheet: `${FOCUS_RING} rounded-sheet`,
  pill: `${FOCUS_RING} rounded-full`,
  row: FOCUS_RING_INSET,
} as const
