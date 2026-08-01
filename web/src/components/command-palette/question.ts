const QUESTION_STARTERS = new Set([
  "am",
  "are",
  "can",
  "could",
  "did",
  "do",
  "does",
  "has",
  "have",
  "how",
  "is",
  "should",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "would",
])

const SENTENCE_WORD_COUNT = 5

export function isQuestion(raw: string): boolean {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return false
  if (trimmed.endsWith("?")) return true

  const words = trimmed.split(/\s+/)
  const first = words[0]?.toLowerCase().replace(/[^a-z']/g, "") ?? ""
  if (QUESTION_STARTERS.has(first)) return true

  return words.length >= SENTENCE_WORD_COUNT
}
