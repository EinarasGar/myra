import { Children, type ReactNode } from "react"

const MONEY = "[-+−]?[£$€¥]\\s?\\d[\\d,]*(?:\\.\\d+)?"
const PERCENT = "[-+−]?\\d[\\d,]*(?:\\.\\d+)?\\s?%"
const GROUPED = "[-+−]?\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?"

const FIGURE_SOURCE = `(?:${MONEY}|${PERCENT}|${GROUPED})`

const FIGURE_PATTERN = new RegExp(FIGURE_SOURCE, "g")
const WHOLE_FIGURE_PATTERN = new RegExp(`^${FIGURE_SOURCE}$`)

const FIGURE_CLASS =
  "font-mono text-[0.94em] font-medium whitespace-nowrap tabular-nums"

export function isFigureText(text: string): boolean {
  return WHOLE_FIGURE_PATTERN.test(text.trim())
}

function splitFigures(text: string): ReactNode {
  const parts: ReactNode[] = []
  let cursor = 0
  for (const match of text.matchAll(FIGURE_PATTERN)) {
    const start = match.index
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      <span key={start} data-figure="" className={FIGURE_CLASS}>
        {match[0]}
      </span>
    )
    cursor = start + match[0].length
  }
  if (parts.length === 0) return text
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

export function withFigures(children: ReactNode): ReactNode {
  return Children.map(children, (child) =>
    typeof child === "string" ? splitFigures(child) : child
  )
}
