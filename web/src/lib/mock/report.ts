import { mockRegistry } from "./registry"
import {
  GAP_IDS,
  GAP_TITLES,
  MOCK_KIND_MEANINGS,
  MOCK_KINDS,
  MOCK_SCREEN_TITLES,
  MOCK_SCREENS,
  type MockEntry,
} from "./types"

export const MOCK_REPORT_PATH = "MOCK_DATA.md"

const INTRO = [
  "# Mocked data in the Sverto web app",
  "",
  "**Generated from `src/lib/mock/registry.ts` — do not edit by hand.**",
  "Regenerate with `bun src/lib/mock/generate-report.ts` from `web/`.",
  "A test (`src/lib/mock/report.test.ts`) fails if this file and the registry disagree,",
  "and a second test fails if a mock module exports anything the registry does not list.",
  "",
  "Every figure listed here is invented. Nothing else in the app is: if a surface is not",
  "named below, it is drawn from the API.",
  "",
  "**Markers are on in every build, development and production.** Each mocked surface",
  'carries a `data-mock="<id>"` attribute naming its entry below, and — wherever the node is',
  "hoverable — a plain-language title disclosing the figures as an example. Where the",
  "layout has room the surface also carries a small `EXAMPLE` badge. Where it has none (the",
  "review-queue count in the rail, the bottom tabs and the profile dot) the badge itself is",
  "drawn hollow and dashed instead of solid, and its accessible name ends in `(example data)`:",
  "a solid badge is a real count, a dashed one is invented. This app is pre-release and gets",
  "screenshotted — an invented financial figure must never be indistinguishable from a real",
  "one, least of all in a build handed to someone else.",
  "",
  "The one escape hatch is `VITE_HIDE_MOCK_MARKERS=true` at build time, for a deliberate",
  "marketing capture. It hides the visible marker only — `data-mock` stays on every mocked",
  "node in every build, so any build can be audited with",
  '`document.querySelectorAll("[data-mock]")`.',
  "",
  "Mock amounts are plain numbers with no currency baked in — screens render them through",
  "`<Figure>` in the user's own reference currency. Every amount is scaled from one",
  "internally consistent ledger (`src/lib/mock/ledger.ts`), the same one the design handoff",
  "uses, so mocked figures agree with each other: the five attribution buckets sum to the",
  "header delta, and the per-holding period column sums to the Market bucket.",
  "",
  "No mocked figure may headline a screen. A mock sits beside or below the real data it",
  "stands in for, never above it and never in the largest type on the page, and a mock",
  "control that cannot act is disabled or is not drawn at all. Being registered and badged",
  "is not a licence to lead with an invented number.",
  "",
]

const CONTRIBUTING = [
  "## Adding a mock",
  "",
  "1. Put the data in `src/lib/mock/<area>.ts` as a `MOCK_*` constant or a `mock*` factory.",
  "   Never inline a fake number in a component.",
  "2. Add a `defineMock({ … })` entry to `src/lib/mock/registry.ts`. The type will not let you",
  "   omit the gap id, the classification, the reason or the backend work that would remove it.",
  "3. Mark the surface with `mockAttributes(id)` (or `mockMarkerProps(id)` for a seam that is",
  "   only sometimes mocked) and, where it fits, `<MockBadge id={id} />`.",
  "4. List the file that renders it in that entry's `consumers`.",
  "5. Run `bun src/lib/mock/generate-report.ts` to refresh this file.",
  "",
  "`src/lib/mock/registry.test.ts` fails if a mock module exports anything the registry does",
  "not list, if a file imports mock data without being listed as a consumer of it, or if a",
  "declared consumer never quotes the id it must mark its surface with. A mock therefore",
  "cannot reach a screen without appearing here, and cannot appear on screen unmarked.",
  "",
]

function kindLegend(): string[] {
  return [
    "## What the classifications mean",
    "",
    ...MOCK_KINDS.map((kind) => `- **${kind}** — ${MOCK_KIND_MEANINGS[kind]}`),
    "",
  ]
}

function markdownTable(rows: readonly (readonly string[])[]): string[] {
  const widths = (rows[0] ?? []).map((_, column) =>
    Math.max(...rows.map((row) => (row[column] ?? "").length), 3)
  )
  const line = (cells: readonly string[]) =>
    `| ${cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join(" | ")} |`
  const [header, ...body] = rows
  if (!header) return []
  return [
    line(header),
    line(widths.map((width) => "-".repeat(width))),
    ...body.map(line),
  ]
}

function summary(entries: readonly MockEntry[], areas: number): string[] {
  const counts = MOCK_KINDS.map(
    (kind) =>
      [kind, entries.filter((entry) => entry.kind === kind).length] as const
  )
  const gaps = [...new Set(entries.flatMap((entry) => entry.gaps))].sort()
  return [
    "## Summary",
    "",
    `${entries.length} mocked surfaces across ${areas} areas.`,
    "",
    ...markdownTable([
      ["Classification", "Surfaces"],
      ...counts.map(([kind, count]) => [kind, String(count)]),
    ]),
    "",
    `Capability gaps covered: ${gaps.join(", ")} (see \`.recon/capability.md\`).`,
    "",
  ]
}

function entrySection(entry: MockEntry): string[] {
  const consumers =
    entry.consumers.length === 0
      ? "Nothing renders it yet."
      : entry.consumers.map((path) => `\`${path}\``).join(", ")
  return [
    `### ${entry.surface}`,
    "",
    `- **Id** \`${entry.id}\``,
    `- **Gap** ${entry.gaps.map((gap) => `${gap} ${GAP_TITLES[gap]}`).join(" · ")} · **${entry.kind}**`,
    `- **Stands in for** ${entry.standsInFor}`,
    `- **Why it is mocked** ${entry.reason}`,
    `- **Backend work that removes it** ${entry.backendWork}`,
    `- **Code** \`${entry.module}\` — ${entry.exports.map((name) => `\`${name}\``).join(", ")}`,
    `- **Rendered by** ${consumers}`,
    "",
  ]
}

function uncoveredGaps(entries: readonly MockEntry[]): string[] {
  const covered = new Set(entries.flatMap((entry) => entry.gaps))
  return [
    "## Capability gaps with no mock",
    "",
    "Every remaining gap in `.recon/capability.md`. None of these is faked anywhere: a screen",
    "either derives the value from endpoints that exist, or the surface is dropped until the",
    "backend supplies it. If a screen needs one of them it must add a registry entry above —",
    "inlining the number in a component fails `src/lib/mock/registry.test.ts`.",
    "",
    ...GAP_IDS.filter((gap) => !covered.has(gap)).map(
      (gap) => `- **${gap}** ${GAP_TITLES[gap]}`
    ),
    "",
  ]
}

export function renderMockReport(
  entries: readonly MockEntry[] = mockRegistry
): string {
  const byScreen = MOCK_SCREENS.map(
    (screen) =>
      [screen, entries.filter((entry) => entry.screen === screen)] as const
  ).filter(([, screenEntries]) => screenEntries.length > 0)

  const lines = [
    ...INTRO,
    ...kindLegend(),
    ...summary(entries, byScreen.length),
  ]
  for (const [screen, screenEntries] of byScreen) {
    lines.push(`## ${MOCK_SCREEN_TITLES[screen]}`, "")
    for (const entry of screenEntries) {
      lines.push(...entrySection(entry))
    }
  }
  lines.push(...uncoveredGaps(entries), ...CONTRIBUTING)
  return `${lines.join("\n").trimEnd()}\n`
}
