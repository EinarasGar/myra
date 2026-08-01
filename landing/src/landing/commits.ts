const ROWS = 8

export interface Commit {
  readonly sha: string
  readonly subject: string
  readonly date: Date
}

interface RawCommit {
  sha?: unknown
  commit?: { message?: unknown; author?: { date?: unknown } }
}

export function toCommits(payload: unknown): Commit[] {
  if (!Array.isArray(payload)) return []
  const commits: Commit[] = []
  for (const raw of payload as RawCommit[]) {
    const sha = raw.sha
    const message = raw.commit?.message
    const date = raw.commit?.author?.date
    if (typeof sha !== "string") continue
    if (typeof message !== "string") continue
    if (typeof date !== "string") continue
    const when = new Date(date)
    if (Number.isNaN(when.getTime())) continue
    commits.push({
      sha: sha.slice(0, 7),
      subject: message.split("\n")[0] ?? "",
      date: when,
    })
  }
  return commits.slice(0, ROWS)
}

export function relativeDay(date: Date, now: Date): string {
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${String(days)}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${String(months)}mo ago`
  return `${String(Math.floor(months / 12))}y ago`
}
