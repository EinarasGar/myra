import { describe, expect, it } from "vitest"

const FACTORY_SUFFIX = "QueryOptions"

const GENERIC_HELPERS = new Set([
  "apiQueryOptions",
  "cursorInfiniteQueryOptions",
  "offsetInfiniteQueryOptions",
])

const PROBE = Symbol("probe")

interface Factory {
  id: string
  readonly call: () => { queryKey: unknown }
}

/**
 * A stand-in for any argument a factory takes. Every property read and every call
 * yields another probe, so a positional signature, an object-destructured one and a
 * `input.query?.trim()` all survive.
 */
function probe(path: string): never {
  const token = `«${path}»`
  return new Proxy((): undefined => undefined, {
    get(_target, property) {
      if (property === PROBE) return path
      if (property === "toJSON" || property === "toString") return () => token
      if (property === Symbol.toPrimitive) return () => token
      if (typeof property === "symbol") return undefined
      return probe(`${path}.${String(property)}`)
    },
    apply() {
      return probe(`${path}()`)
    },
  }) as never
}

type Pattern =
  | { kind: "any"; path: string }
  | { kind: "value"; value: string | number | boolean | null }
  | { kind: "list"; items: Pattern[] }
  | { kind: "record"; entries: [string, Pattern][] }

function probePath(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== "function" && typeof value !== "object") return null
  const path = (value as Record<symbol, unknown>)[PROBE]
  return typeof path === "string" ? path : null
}

/**
 * `hashKey` sorts object properties and drops the `undefined` ones, so a property whose
 * value is argument-derived may or may not be in the hashed key at runtime. Modelling it
 * as a hole rather than a token is what lets a constant-argument factory be compared
 * against a parameterised one.
 */
function toPattern(value: unknown): Pattern {
  const path = probePath(value)
  if (path !== null) return { kind: "any", path }
  if (value === null || value === undefined)
    return { kind: "value", value: null }
  if (Array.isArray(value)) return { kind: "list", items: value.map(toPattern) }
  if (typeof value === "number" && !Number.isFinite(value)) {
    return { kind: "any", path: "a computed number" }
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return { kind: "value", value }
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, property]) => property !== undefined)
      .map(([name, property]): [string, Pattern] => [name, toPattern(property)])
      .sort(([left], [right]) => left.localeCompare(right))
    return { kind: "record", entries }
  }
  return { kind: "value", value: String(value) }
}

function recordsCanCollide(
  left: [string, Pattern][],
  right: [string, Pattern][]
): boolean {
  const rightByName = new Map(right)
  const leftByName = new Map(left)
  for (const [name, pattern] of left) {
    const other = rightByName.get(name)
    if (other === undefined) {
      if (pattern.kind !== "any") return false
      continue
    }
    if (!canCollide(pattern, other)) return false
  }
  for (const [name, pattern] of right) {
    if (leftByName.has(name)) continue
    if (pattern.kind !== "any") return false
  }
  return true
}

/** True when some assignment of the two factories' arguments makes their keys hash alike. */
function canCollide(left: Pattern, right: Pattern): boolean {
  if (left.kind === "any" || right.kind === "any") return true
  if (left.kind === "value" && right.kind === "value") {
    return Object.is(left.value, right.value)
  }
  if (left.kind === "list" && right.kind === "list") {
    if (left.items.length !== right.items.length) return false
    return left.items.every((item, index) => {
      const other = right.items[index]
      return other !== undefined && canCollide(item, other)
    })
  }
  if (left.kind === "record" && right.kind === "record") {
    return recordsCanCollide(left.entries, right.entries)
  }
  return false
}

function describePattern(pattern: Pattern): string {
  if (pattern.kind === "any") return `«${pattern.path}»`
  if (pattern.kind === "value") return JSON.stringify(pattern.value)
  if (pattern.kind === "list") {
    return `[${pattern.items.map(describePattern).join(",")}]`
  }
  const entries = pattern.entries.map(
    ([name, value]) => `${name}:${describePattern(value)}`
  )
  return `{${entries.join(",")}}`
}

function collectFactories(): Factory[] {
  const modules = import.meta.glob<Record<string, unknown>>(
    ["/src/features/**/*.ts", "/src/auth/*.ts", "!/src/**/*.test.ts"],
    { eager: true }
  )

  const found = new Map<unknown, Factory>()
  for (const [path, module] of Object.entries(modules)) {
    for (const [name, value] of Object.entries(module)) {
      if (!name.endsWith(FACTORY_SUFFIX)) continue
      if (GENERIC_HELPERS.has(name)) continue
      if (typeof value !== "function") continue
      const seen = found.get(value)
      if (seen !== undefined) {
        if (!path.endsWith("/index.ts")) seen.id = `${name} (${path})`
        continue
      }
      const call = value as (...args: unknown[]) => { queryKey: unknown }
      found.set(value, {
        id: `${name} (${path})`,
        call: () => call(probe("a"), probe("b"), probe("c"), probe("d")),
      })
    }
  }
  return [...found.values()].sort((a, b) => a.id.localeCompare(b.id))
}

interface Probed {
  factory: Factory
  pattern: Pattern
}

function probeFactories(): { probed: Probed[]; unreadable: string[] } {
  const probed: Probed[] = []
  const unreadable: string[] = []

  for (const factory of collectFactories()) {
    try {
      probed.push({ factory, pattern: toPattern(factory.call().queryKey) })
    } catch {
      unreadable.push(factory.id)
    }
  }
  return { probed, unreadable }
}

function collisions(probed: Probed[]): string[] {
  const found: string[] = []
  for (const [index, left] of probed.entries()) {
    for (const right of probed.slice(index + 1)) {
      if (!canCollide(left.pattern, right.pattern)) continue
      found.push(
        [
          `${left.factory.id}\n    ${describePattern(left.pattern)}`,
          `${right.factory.id}\n    ${describePattern(right.pattern)}`,
        ].join("\n  collides with ")
      )
    }
  }
  return found
}

function patternOf(probed: Probed[], id: string): Pattern {
  const match = probed.find((entry) => entry.factory.id.startsWith(`${id} (`))
  if (match === undefined) throw new Error(`no factory named ${id}`)
  return match.pattern
}

describe("query key registry", () => {
  const { probed, unreadable } = probeFactories()

  it("finds the query-options factories to check", () => {
    expect(probed.length).toBeGreaterThan(20)
  })

  it("can read every factory's key", () => {
    expect(unreadable).toEqual([])
  })

  it("gives each factory a cache node of its own", () => {
    expect(collisions(probed)).toEqual([])
  })

  it("keeps the currency list off the paged asset-search node", () => {
    expect(
      canCollide(
        patternOf(probed, "currencyAssetsQueryOptions"),
        patternOf(probed, "assetSearchInfiniteQueryOptions")
      )
    ).toBe(false)
  })
})

describe("canCollide", () => {
  const literal = toPattern(["reference", "assets", "search"])

  it("sees through a constant key that a parameterised one can reproduce", () => {
    expect(
      canCollide(
        toPattern([
          "reference",
          "assets",
          "search",
          { count: 500, assetType: 1 },
        ]),
        toPattern([
          "reference",
          "assets",
          "search",
          { count: probe("a.count"), assetType: probe("a.assetType") },
        ])
      )
    ).toBe(true)
  })

  it("treats a property only one side declares as optional when it is argument-derived", () => {
    expect(
      canCollide(
        toPattern(["search", { count: 500 }]),
        toPattern(["search", { count: 500, query: probe("a.query") }])
      )
    ).toBe(true)
  })

  it("keeps a constant property that only one side declares apart", () => {
    expect(
      canCollide(
        toPattern(["search", { count: 500, start: 0 }]),
        toPattern(["search", { count: probe("a.count") }])
      )
    ).toBe(false)
  })

  it("keeps different literals, lengths and shapes apart", () => {
    expect(
      canCollide(literal, toPattern(["reference", "assets", "detail"]))
    ).toBe(false)
    expect(canCollide(literal, toPattern(["reference", "assets"]))).toBe(false)
    expect(canCollide(literal, toPattern({ reference: "assets" }))).toBe(false)
    expect(canCollide(toPattern([probe("a")]), toPattern([{ count: 1 }]))).toBe(
      true
    )
  })
})
