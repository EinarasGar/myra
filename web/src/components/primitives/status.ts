export const STATUS_WORDS = {
  active: { label: "Active", tone: "text-positive", dot: "bg-positive" },
  pending: { label: "Pending", tone: "text-attention", dot: "bg-attention" },
  needsAttention: {
    label: "Needs attention",
    tone: "text-negative",
    dot: "bg-negative",
  },
  paused: { label: "Paused", tone: "text-ghost", dot: "bg-ghost" },
  notLinked: { label: "Not linked", tone: "text-ghost", dot: "bg-ghost" },
  unreviewed: { label: "Unreviewed", tone: "text-ghost", dot: "bg-ghost" },
} as const

export type StatusWord = keyof typeof STATUS_WORDS

export const META_CHIP_TONES = {
  ghost: "text-ghost",
  brand: "text-brand",
  ink: "text-ink-2",
  attention: "text-attention",
} as const

export type MetaChipTone = keyof typeof META_CHIP_TONES
