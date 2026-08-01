import { describe, expect, it } from "vitest"

const { Route } = await import("@/routes/_auth/_shell/settings")
const { SETTINGS_SECTIONS } = await import("./nav")

interface SearchResult {
  section: string
  connection?: string
}

type SearchValidator =
  | ((input: unknown) => SearchResult)
  | { parse: (input: unknown) => SearchResult }

function parseSearch(input: unknown): SearchResult {
  const validate = Route.options.validateSearch as unknown as SearchValidator
  return typeof validate === "function"
    ? validate(input)
    : validate.parse(input)
}

describe("the /settings route", () => {
  it("mounts a component rather than a placeholder", () => {
    expect(Route.options.component).toBeTypeOf("function")
  })

  it("lands on General when no section is asked for", () => {
    expect(parseSearch({}).section).toBe("general")
  })

  it("accepts every section the rail links to", () => {
    for (const section of SETTINGS_SECTIONS) {
      expect(parseSearch({ section }).section).toBe(section)
    }
  })

  it("lands on General for a section that does not exist rather than erroring out", () => {
    expect(parseSearch({ section: "nope" }).section).toBe("general")
  })

  it("carries a connection id so a connection has its own address", () => {
    expect(parseSearch({ section: "connections", connection: "c1" })).toEqual({
      section: "connections",
      connection: "c1",
    })
  })
})
