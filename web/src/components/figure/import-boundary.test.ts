import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

import { describe, expect, it } from "vitest"

const SRC = resolve(process.cwd(), "src")
const ENTRY = join(SRC, "components/figure/index.ts")

const FORBIDDEN_PACKAGE = /^@clerk(\/|$)/
const FORBIDDEN_DIR = join(SRC, "auth")

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
    ? join(SRC, specifier.slice(2))
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
      `Cannot resolve "${specifier}" from ${relative(SRC, importer)}`
    )
  }
  return file
}

interface Edge {
  importer: string
  specifier: string
}

function walk(entry: string) {
  const files = new Set<string>([entry])
  const packages: Edge[] = []
  const localEdges: Edge[] = []
  const queue = [entry]

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

const graph = walk(ENTRY)

function describeEdge({ importer, specifier }: Edge): string {
  return `${relative(SRC, importer)} -> ${specifier}`
}

describe("@/components/figure import boundary", () => {
  it("walks a real module graph", () => {
    const files = [...graph.files].map((file) => relative(SRC, file))
    expect(files).toContain("components/figure/figure.tsx")
    expect(files).toContain("components/figure/base-currency.tsx")
    expect(files).toContain("lib/format/figures.ts")
  })

  it("reaches no module under src/auth", () => {
    const offenders = graph.localEdges
      .filter((edge) => edge.specifier.startsWith(`${FORBIDDEN_DIR}/`))
      .map(
        (edge) =>
          `${relative(SRC, edge.importer)} -> ${relative(SRC, edge.specifier)}`
      )
    expect(offenders).toEqual([])
  })

  it("reaches no Clerk package", () => {
    const offenders = graph.packages
      .filter((edge) => FORBIDDEN_PACKAGE.test(edge.specifier))
      .map(describeEdge)
    expect(offenders).toEqual([])
  })
})
