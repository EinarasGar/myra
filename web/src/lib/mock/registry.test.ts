import { describe, expect, it } from "vitest"

import {
  getMockEntry,
  mockEntriesForScreen,
  mockRegistry,
  mockScreensWithEntries,
} from "./registry"
import {
  defineMock,
  GAP_IDS,
  GAP_TITLES,
  isMockExportName,
  MOCK_KINDS,
  MOCK_SCREENS,
  type MockEntry,
} from "./types"

const INFRA_MODULES = new Set([
  "./index.ts",
  "./markers.ts",
  "./registry.ts",
  "./report.ts",
  "./types.ts",
])

const modules = import.meta.glob<Record<string, unknown>>(
  ["./*.ts", "!./*.test.ts", "!./generate-report.ts"],
  { eager: true }
)

const dataModules = Object.entries(modules).filter(
  ([path]) => !INFRA_MODULES.has(path)
)

function toRepoPath(globPath: string): string {
  return globPath.replace("./", "src/lib/mock/")
}

const sources = import.meta.glob<string>(
  ["../../**/*.ts", "../../**/*.tsx", "!../../lib/mock/**", "!../../**/*.d.ts"],
  { query: "?raw", import: "default", eager: true }
)

const MARKER_EXPORTS = new Set([
  "areMockMarkersVisible",
  "mockAttributes",
  "mockMarkerProps",
  "mockTitle",
  "MockBadge",
  "getMockEntry",
  "mockEntriesForScreen",
  "mockScreensWithEntries",
  "mockRegistry",
  "defineMock",
  "isMockExportName",
  "renderMockReport",
])

const MOCK_IMPORT =
  /import\s+(?!type\b)([^"';]*?)\s+from\s+["']@\/lib\/mock[^"']*["']/g

function importedMockValues(source: string): string[] {
  const names: string[] = []
  for (const [, clause] of source.matchAll(MOCK_IMPORT)) {
    const braced = /\{([\s\S]*?)\}/.exec(clause ?? "")?.[1] ?? ""
    for (const specifier of braced.split(",")) {
      const name =
        specifier
          .trim()
          .split(/\s+as\s+/)[0]
          ?.trim() ?? ""
      if (name === "" || name.startsWith("type ")) continue
      names.push(name)
    }
  }
  return names
}

function ownsExport(entry: MockEntry, name: string): boolean {
  return (entry.exports as readonly string[]).includes(name)
}

const consumingFiles = Object.entries(sources)
  .map(([path, source]) => ({
    path: path.replace("../../", "src/"),
    source,
    dataNames: importedMockValues(source).filter(
      (name) => !MARKER_EXPORTS.has(name)
    ),
  }))
  .filter(
    ({ path, dataNames }) => dataNames.length > 0 && !path.includes(".test.")
  )

const validEntry: MockEntry = {
  id: "test.entry",
  screen: "dashboard",
  surface: "A surface",
  standsInFor: "A figure",
  gaps: ["A1"],
  kind: "BACKEND",
  reason: "No endpoint",
  backendWork: "Add an endpoint",
  module: "src/lib/mock/dashboard.ts",
  exports: ["MOCK_THING"],
  consumers: [],
}

describe("defineMock", () => {
  it("accepts a fully stated entry", () => {
    expect(defineMock(validEntry)).toBe(validEntry)
  })

  it.each(["id", "surface", "standsInFor", "reason", "backendWork"] as const)(
    "rejects a blank %s",
    (field) => {
      expect(() => defineMock({ ...validEntry, [field]: "  " })).toThrow(field)
    }
  )

  it("rejects a module outside src/lib/mock", () => {
    expect(() =>
      defineMock({ ...validEntry, module: "src/features/dashboard/data.ts" })
    ).toThrow(/mocks live under/)
  })

  it("rejects an export that is not named as a mock", () => {
    expect(() =>
      defineMock({ ...validEntry, exports: ["dashboardTotals"] })
    ).toThrow(/named MOCK_\* or mock\*/)
  })

  it.each(["lib/mock/shell.ts", "src/lib/mock/shell.ts", "components/x.tsx"])(
    "rejects %s as a consumer",
    (consumer) => {
      expect(() =>
        defineMock({ ...validEntry, consumers: [consumer] })
      ).toThrow(/consumers are repo-relative/)
    }
  )
})

describe("isMockExportName", () => {
  it.each(["MOCK_LEDGER", "MOCK_LOT_COUNTS", "mockPricesAsOf"])(
    "accepts %s",
    (name) => {
      expect(isMockExportName(name)).toBe(true)
    }
  )

  it.each(["ledger", "MOCKED", "mock", "Mockery"])("rejects %s", (name) => {
    expect(isMockExportName(name)).toBe(false)
  })
})

describe("mockRegistry", () => {
  it("has a unique id per entry", () => {
    const ids = mockRegistry.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("states a known screen, kind and gap for every entry", () => {
    for (const entry of mockRegistry) {
      expect(MOCK_SCREENS).toContain(entry.screen)
      expect(MOCK_KINDS).toContain(entry.kind)
      expect(entry.gaps.length).toBeGreaterThan(0)
      for (const gap of entry.gaps) {
        expect(GAP_IDS).toContain(gap)
      }
    }
  })

  it("finds an entry by id and rejects an unknown one", () => {
    expect(getMockEntry("dashboard.attribution").screen).toBe("dashboard")
    expect(() =>
      getMockEntry("nope" as (typeof mockRegistry)[number]["id"])
    ).toThrow(/Unknown mock id/)
  })

  it("groups entries by screen", () => {
    expect(mockScreensWithEntries()).toContain("portfolio")
    expect(mockEntriesForScreen("settings").map((entry) => entry.id)).toEqual([
      "settings.myra-permissions",
      "settings.connection-import-totals",
    ])
  })
})

describe("registry coverage of the mock modules", () => {
  it("scans every mock data module", () => {
    expect(dataModules.length).toBeGreaterThan(0)
  })

  it("registers every mock export that exists", () => {
    const declared = new Set<string>(
      mockRegistry.flatMap((entry) => entry.exports)
    )
    const unregistered: string[] = []
    for (const [path, module] of dataModules) {
      for (const name of Object.keys(module)) {
        if (isMockExportName(name) && !declared.has(name)) {
          unregistered.push(`${toRepoPath(path)} → ${name}`)
        }
      }
    }
    expect(unregistered).toEqual([])
  })

  it("exports nothing from a mock module that is not named as a mock", () => {
    const misnamed: string[] = []
    for (const [path, module] of dataModules) {
      for (const name of Object.keys(module)) {
        if (!isMockExportName(name)) {
          misnamed.push(`${toRepoPath(path)} → ${name}`)
        }
      }
    }
    expect(misnamed).toEqual([])
  })

  it("titles every capability gap it can cite", () => {
    for (const gap of GAP_IDS) {
      expect(GAP_TITLES[gap].trim()).not.toBe("")
    }
  })

  it("points every declared export at a module that really exports it", () => {
    const byPath = new Map(
      dataModules.map(([path, module]) => [toRepoPath(path), module])
    )
    const missing: string[] = []
    for (const entry of mockRegistry) {
      const module = byPath.get(entry.module)
      if (!module) {
        missing.push(`${entry.id} → ${entry.module} was not scanned`)
        continue
      }
      for (const name of entry.exports) {
        if (!(name in module)) {
          missing.push(`${entry.id} → ${entry.module} has no ${name}`)
        }
      }
    }
    expect(missing).toEqual([])
  })
})

describe("no mock reaches a screen unregistered or unmarked", () => {
  it("scans the app source outside src/lib/mock", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50)
    expect(consumingFiles.map((file) => file.path)).toContain(
      "src/features/dashboard/api/attribution.ts"
    )
  })

  it("registers every mock value any file imports", () => {
    const declared = new Set<string>(
      mockRegistry.flatMap((entry) => entry.exports)
    )
    const unregistered = consumingFiles.flatMap((file) =>
      file.dataNames
        .filter((name) => !declared.has(name))
        .map((name) => `${file.path} → ${name}`)
    )
    expect(unregistered).toEqual([])
  })

  it("lists every consuming file on the entry it consumes", () => {
    const undeclared: string[] = []
    for (const file of consumingFiles) {
      for (const name of file.dataNames) {
        const owner = mockRegistry.find((entry) => ownsExport(entry, name))
        if (
          owner &&
          !(owner.consumers as readonly string[]).includes(file.path)
        ) {
          undeclared.push(`${file.path} → ${owner.id}`)
        }
      }
    }
    expect(undeclared).toEqual([])
  })

  it("makes every consuming file quote the id it must mark the surface with", () => {
    const unmarked: string[] = []
    for (const entry of mockRegistry) {
      for (const consumer of entry.consumers) {
        const file = consumingFiles.find((scanned) => scanned.path === consumer)
        if (!file) {
          unmarked.push(`${entry.id} → ${consumer} imports nothing from it`)
        } else if (!file.source.includes(`"${entry.id}"`)) {
          unmarked.push(`${entry.id} → ${consumer} never names the id`)
        }
      }
    }
    expect(unmarked).toEqual([])
  })

  it("would catch a mock consumed by a file that never declared itself", () => {
    const invented = {
      path: "src/features/dashboard/hero.tsx",
      source: 'import { MOCK_LEDGER } from "@/lib/mock"',
    }
    const names = importedMockValues(invented.source).filter(
      (name) => !MARKER_EXPORTS.has(name)
    )
    expect(names).toEqual(["MOCK_LEDGER"])
    const owner = mockRegistry.find((entry) => ownsExport(entry, "MOCK_LEDGER"))
    expect(owner?.consumers).not.toContain(invented.path)
  })

  it("does not treat a type-only import as consumption", () => {
    expect(
      importedMockValues('import type { MockId } from "@/lib/mock"')
    ).toEqual([])
    expect(
      importedMockValues('import { type MockId } from "@/lib/mock"')
    ).toEqual([])
  })
})
