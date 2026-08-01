import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { compile } from "@tailwindcss/node"
import { render, screen } from "@testing-library/react"
import postcss from "postcss"
import { beforeAll, describe, expect, it } from "vitest"

import { Button } from "@/components/ui/button"

import { FOCUS_RING, focusRing } from "./focus-ring"

const WEB_ROOT = resolve(process.cwd())
const CSS_ENTRY = resolve(WEB_ROOT, "src/index.css")

type Declarations = Record<string, string>

let build: (candidates: string[]) => string

beforeAll(async () => {
  const compiler = await compile(readFileSync(CSS_ENTRY, "utf8"), {
    base: WEB_ROOT,
    onDependency: () => {},
  })
  build = (candidates) => compiler.build(candidates)
}, 60_000)

function selectorMatches(selector: string, className: string): number | null {
  const plain = selector.replaceAll("\\", "")
  if (plain === `.${className}`) return 1
  if (plain === `.${className}:focus-visible`) return 2
  return null
}

/**
 * A ring declared as `outline-2` alone resolves its style through `--tw-outline-style`, which
 * `outline-none`/`outline-hidden` set to `none` — so only running the real cascade proves the
 * ring paints.
 */
function computeFocusVisible(classNames: string[]): Declarations {
  const css = build(classNames)
  const layered: {
    weight: number
    order: number
    prop: string
    value: string
  }[] = []
  let order = 0

  postcss.parse(css).walkRules((rule) => {
    for (const selector of rule.selectors) {
      for (const className of classNames) {
        const weight = selectorMatches(selector, className)
        if (weight === null) continue
        rule.walkDecls((decl) => {
          order += 1
          layered.push({ weight, order, prop: decl.prop, value: decl.value })
        })
      }
    }
  })

  layered.sort((a, b) => a.weight - b.weight || a.order - b.order)

  const computed: Declarations = {}
  for (const { prop, value } of layered) {
    computed[prop] = value.replace(
      /var\(--tw-outline-style\)/g,
      computed["--tw-outline-style"] ?? "none"
    )
  }
  return computed
}

function classesOf(element: HTMLElement): string[] {
  return element.className.split(/\s+/).filter(Boolean)
}

describe("the pointer cursor every control owes a mouse", () => {
  it("is granted in the base layer, not per component", () => {
    const css = build(["outline-hidden"]).replace(/\s+/g, " ")
    const rule =
      /([^{}]*)\{ cursor: pointer;/.exec(css)?.[1]?.replace(/\s+/g, " ") ?? ""

    expect(rule).toContain('button:not(:disabled):not([aria-disabled="true"])')
    expect(rule).toContain('[role="button"]')
    expect(rule).toContain('[role="option"]')
    expect(rule).toContain('[role="menuitem"]')
    expect(rule).toContain("select:not(:disabled)")
  })
})

describe("the focus ring the design mandates", () => {
  it("paints a 2px brand outline at 2px offset on a focused button", () => {
    render(<Button>New transaction</Button>)
    const computed = computeFocusVisible(
      classesOf(screen.getByRole("button", { name: "New transaction" }))
    )

    expect(computed["outline-style"]).toBe("solid")
    expect(computed["outline-width"]).toBe("2px")
    expect(computed["outline-offset"]).toBe("2px")
    expect(computed["outline-color"]).toBe("var(--sv-brand)")
  })

  it.each([
    ["chip", focusRing.chip],
    ["sm", focusRing.sm],
    ["button", focusRing.button],
    ["md", focusRing.md],
    ["panel", focusRing.panel],
    ["sheet", focusRing.sheet],
    ["pill", focusRing.pill],
  ])("paints on a %s-radius control too", (_radius, classes) => {
    const computed = computeFocusVisible([
      "outline-hidden",
      ...classes.split(" "),
    ])
    expect(computed["outline-style"]).toBe("solid")
    expect(computed["outline-width"]).toBe("2px")
    expect(computed["outline-color"]).toBe("var(--sv-brand)")
  })

  it("survives a control that also hides its native outline", () => {
    const computed = computeFocusVisible([
      "outline-none",
      "outline-hidden",
      ...FOCUS_RING.split(" "),
    ])
    expect(computed["outline-style"]).toBe("solid")
  })

  it("follows the control's own radius", () => {
    expect(focusRing.chip).toContain("rounded-chip")
    expect(focusRing.button).toContain("rounded-button")
    expect(focusRing.panel).toContain("rounded-panel")
    expect(focusRing.sheet).toContain("rounded-sheet")
    expect(focusRing.pill).toContain("rounded-full")
  })
})
