import { useEffect, useState } from "react"

import { useShellWidth } from "@/components/layout/breakpoints"

import { Truncate } from "@/components/primitives/truncate"

import type { Commit } from "./commits"
import { relativeDay, toCommits } from "./commits"
import { GithubGlyph } from "./cta"
import { LANDING_SOURCE_URL } from "./links"
import { MetaLabel } from "./section"

const COMMITS_ENDPOINT =
  "https://api.github.com/repos/EinarasGar/myra/commits?per_page=8"

const ROWS = 8

function Row({ commit, now }: { commit: Commit; now: Date }) {
  return (
    <li className="flex items-baseline gap-3 border-b border-border py-[10px] last:border-b-0">
      <span className="font-mono text-[10.5px] leading-none text-ink-3 tabular-nums">
        {commit.sha}
      </span>
      <Truncate
        text={commit.subject}
        className="min-w-0 flex-1 text-[12.5px] leading-[1.35] text-ink-2"
      />
      <span className="font-mono text-[10.5px] leading-none whitespace-nowrap text-ink-3">
        {relativeDay(commit.date, now)}
      </span>
    </li>
  )
}

function Skeleton() {
  return (
    <ul aria-hidden className="flex flex-col">
      {Array.from({ length: ROWS }, (_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 border-b border-border py-[9px] last:border-b-0"
        >
          <span className="h-[9px] w-[46px] rounded-chip bg-border" />
          <span className="h-[9px] min-w-0 flex-1 rounded-chip bg-border" />
          <span className="h-[9px] w-[38px] rounded-chip bg-border" />
        </li>
      ))}
    </ul>
  )
}

/**
 * Unauthenticated GitHub allows 60 requests an hour per client IP, so a browser
 * fetch spends the visitor's own budget rather than a shared one.
 */
export function CommitFeed() {
  const width = useShellWidth()
  const besideTheStory = width === "full" || width === "tight"

  const [rows, setRows] = useState<Commit[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!besideTheStory) return undefined
    const abort = new AbortController()
    fetch(COMMITS_ENDPOINT, {
      signal: abort.signal,
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: unknown) => {
        setRows(toCommits(payload))
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true)
      })
    return () => {
      abort.abort()
    }
  }, [besideTheStory])

  // Stacked under the story it is filler, so it is not rendered and never fetched.
  if (!besideTheStory) return null
  if (failed) return null

  const now = new Date()

  return (
    <aside
      data-slot="commit-feed"
      className="rounded-panel border border-border bg-surface p-[18px]"
    >
      <div className="flex items-center justify-between gap-3">
        <MetaLabel>Latest commits</MetaLabel>
        <a
          href={LANDING_SOURCE_URL}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Open the repository on GitHub"
          className="flex items-center gap-1.5 rounded-chip text-[11px] leading-none font-medium text-ink-3 outline-none hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <GithubGlyph className="size-[13px]" />
          GitHub
        </a>
      </div>

      <div className="mt-3">
        {rows === null || rows.length === 0 ? (
          <Skeleton />
        ) : (
          <ul className="flex flex-col">
            {rows.map((commit) => (
              <Row key={commit.sha} commit={commit} now={now} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
