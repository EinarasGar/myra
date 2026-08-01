import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { beforeAll, describe, expect, it } from "vitest"

const DIST = resolve(fileURLToPath(new URL("../dist", import.meta.url)))
const INDEX = resolve(DIST, "index.html")

let html = ""

beforeAll(() => {
  if (!existsSync(INDEX)) {
    throw new Error(`${INDEX} is missing — run "bun run build" first.`)
  }
  html = readFileSync(INDEX, "utf8")
})

function metaContent(html: string, attribute: string, name: string): string[] {
  const pattern = new RegExp(`<meta[^>]*\\b${attribute}="${name}"[^>]*>`, "gi")
  return [...html.matchAll(pattern)].map(
    (match) => /\bcontent="([^"]*)"/.exec(match[0])?.[1] ?? ""
  )
}

function anchors(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/gi)].map((match) => match[0])
}

function hrefOf(tag: string): string | null {
  return /\bhref="([^"]*)"/.exec(tag)?.[1] ?? null
}

describe("served landing HTML", () => {
  it("carries the marketing copy without running any JavaScript", () => {
    expect(html).toContain("One ledger for your groceries and your portfolio.")
    expect(html).toMatch(/<h1\b/)
    expect(html).toContain('<html lang="en">')
  })

  it("carries the tags a link unfurler reads", () => {
    expect(/<title>[^<]{20,}<\/title>/.test(html)).toBe(true)
    expect(
      metaContent(html, "name", "description")[0]?.length ?? 0
    ).toBeGreaterThan(50)
    expect(/<link rel="canonical" href="https?:\/\/[^"]+">/.test(html)).toBe(
      true
    )

    for (const property of [
      "og:type",
      "og:url",
      "og:title",
      "og:description",
    ]) {
      expect(metaContent(html, "property", property)[0]).toBeTruthy()
    }
    expect(metaContent(html, "property", "og:image")[0]).toMatch(/^https?:\/\//)
    expect(metaContent(html, "name", "twitter:card")[0]).toBe(
      "summary_large_image"
    )
    expect(metaContent(html, "name", "twitter:image")[0]).toMatch(
      /^https?:\/\//
    )
  })

  it("never links to a destination that does not exist", () => {
    for (const tag of anchors(html)) {
      const href = hrefOf(tag)
      expect(href, tag).toBeTruthy()
      expect(href, tag).not.toBe("#")
    }
  })

  it("sends every app link to one configured origin rather than a hardcoded domain", () => {
    const appLinks = anchors(html)
      .map(hrefOf)
      .filter((href): href is string => href !== null)
      .filter((href) => /\/(signup|login)$/.test(href))

    expect(appLinks.length).toBeGreaterThan(0)
    const origins = new Set(appLinks.map((href) => new URL(href).origin))
    expect([...origins]).toHaveLength(1)
  })

  it("ships the commit feed as the only island and no other client bundle", () => {
    const islands = [...html.matchAll(/<astro-island\b[^>]*>/g)]
    expect(islands).toHaveLength(1)
    expect(islands[0]?.[0]).toContain('component-export="CommitFeed"')
    expect(html).not.toMatch(/<script[^>]+\bsrc=/)
  })
})
