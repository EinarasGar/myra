import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const LANDING = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const LANDING_SRC = join(LANDING, "src")
const WEB_SRC = resolve(LANDING, "../web/src")

const FORBIDDEN_PACKAGES = [
  /^@clerk(\/|$)/,
  /^@tanstack\/react-router(\/|$)/,
  /^@tanstack\/router-plugin(\/|$)/,
  /^@tanstack\/react-query(\/|$)/,
  /^axios(\/|$)/,
  /^zustand(\/|$)/,
  /^react-hook-form(\/|$)/,
  /^shiki(\/|$)/,
  /^streamdown(\/|$)/,
  /^recharts(\/|$)/,
]

const FORBIDDEN_WEB_DIRS = [
  "auth",
  "api",
  "routes",
  "features",
  "lib/query",
  "lib/api",
  "lib/sse",
  "lib/errors",
  "lib/env.ts",
  "components/layout/app-router-provider.tsx",
  "components/layout/route-boundaries.tsx",
]

const SPECIFIER_PATTERNS = [
  /\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /^\s*import\s+["']([^"']+)["']/gm,
]

function specifiersOf(source: string): string[] {
  const found = new Set<string>()
  for (const pattern of SPECIFIER_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1]
      if (specifier !== undefined) found.add(specifier)
    }
  }
  return [...found]
}

function resolveModule(importer: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? join(WEB_SRC, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(importer), specifier)
      : null
  if (base === null) return null
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]
  const file = candidates.find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile()
  )
  if (!file) {
    throw new Error(
      `Cannot resolve "${specifier}" from ${relative(LANDING, importer)}`
    )
  }
  return file
}

function astroFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return astroFiles(path)
    return entry.name.endsWith(".astro") ? [path] : []
  })
}

/**
 * Entries come from the .astro files rather than a hardcoded list, so a new island or page
 * is inside the boundary the moment it is mounted, without anyone remembering to add it.
 */
function entryPoints(): string[] {
  const entries = new Set<string>()
  for (const page of astroFiles(LANDING_SRC)) {
    for (const specifier of specifiersOf(readFileSync(page, "utf8"))) {
      if (specifier.endsWith(".astro") || specifier.endsWith(".css")) continue
      const resolved = resolveModule(page, specifier)
      if (resolved !== null) entries.add(resolved)
    }
  }
  return [...entries]
}

interface Edge {
  importer: string
  specifier: string
}

function walk(entries: string[]) {
  const files = new Set<string>(entries)
  const packages: Edge[] = []
  const localEdges: Edge[] = []
  const queue = [...entries]

  while (queue.length > 0) {
    const file = queue.pop()!
    for (const specifier of specifiersOf(readFileSync(file, "utf8"))) {
      const resolved = resolveModule(file, specifier)
      if (resolved === null) {
        packages.push({ importer: file, specifier })
        continue
      }
      localEdges.push({ importer: file, specifier: resolved })
      if (files.has(resolved)) continue
      files.add(resolved)
      queue.push(resolved)
    }
  }

  return { files, packages, localEdges }
}

const entries = entryPoints()
const graph = walk(entries)

function describeEdge({ importer, specifier }: Edge): string {
  return `${relative(LANDING, importer)} -> ${specifier}`
}

function describeLocalEdge({ importer, specifier }: Edge): string {
  return `${relative(LANDING, importer)} -> ${relative(LANDING, specifier)}`
}

describe("landing import boundary", () => {
  it("walks a real module graph from every .astro entry", () => {
    const found = [...entries].map((file) => relative(LANDING, file))
    expect(found).toContain("src/landing/landing-page.tsx")
    expect(found).toContain("src/landing/commit-feed.tsx")

    const files = [...graph.files].map((file) => relative(LANDING, file))
    expect(files).toContain("src/landing/sections/founder-section.tsx")
    expect(files).toContain(
      relative(LANDING, join(WEB_SRC, "components/figure/figure.tsx"))
    )
    expect(files).toContain(
      relative(LANDING, join(WEB_SRC, "components/ui/button.tsx"))
    )
  })

  it("reaches no app-only module in web/src", () => {
    const offenders = graph.localEdges
      .filter((edge) =>
        FORBIDDEN_WEB_DIRS.some((forbidden) => {
          const target = join(WEB_SRC, forbidden)
          return (
            edge.specifier === target || edge.specifier.startsWith(`${target}/`)
          )
        })
      )
      .map(describeLocalEdge)
    expect(offenders).toEqual([])
  })

  it("reaches no app-only package", () => {
    const offenders = graph.packages
      .filter((edge) =>
        FORBIDDEN_PACKAGES.some((pattern) => pattern.test(edge.specifier))
      )
      .map(describeEdge)
    expect(offenders).toEqual([])
  })

  it("reaches nothing outside landing/src and web/src", () => {
    const offenders = graph.localEdges
      .filter(
        (edge) =>
          !edge.specifier.startsWith(`${LANDING_SRC}/`) &&
          !edge.specifier.startsWith(`${WEB_SRC}/`)
      )
      .map(describeLocalEdge)
    expect(offenders).toEqual([])
  })
})
