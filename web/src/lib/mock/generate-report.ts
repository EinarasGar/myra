/// <reference types="node" />
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { MOCK_REPORT_PATH, renderMockReport } from "./report"

const target = fileURLToPath(
  new URL(`../../../${MOCK_REPORT_PATH}`, import.meta.url)
)

writeFileSync(target, renderMockReport(), "utf8")
process.stdout.write(`wrote ${target}\n`)
