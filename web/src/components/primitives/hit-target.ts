/**
 * A 44px square centred on the control, painted by `::after` so it costs no layout. Glyph
 * buttons draw at 10-22px, which is under every touch guideline; this restores the target
 * without changing what is on screen.
 */
export const HIT_TARGET =
  "relative after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"

/**
 * The same 44px minimum for a control that sits in a row of others: it grows in height only,
 * so neighbours on the same line keep their own clicks.
 */
export const HIT_TARGET_ROW =
  "relative after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
