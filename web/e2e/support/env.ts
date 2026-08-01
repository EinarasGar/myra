import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const ENV_PATH = fileURLToPath(new URL("../../../.env", import.meta.url))

export interface RepoEnv {
  readonly vitePort: number
  readonly serverPort: number
}

function parseEnvFile(text: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (trimmed === "" || trimmed.startsWith("#")) continue
    const separator = trimmed.indexOf("=")
    if (separator === -1) continue
    values[trimmed.slice(0, separator).trim()] = trimmed
      .slice(separator + 1)
      .trim()
  }
  return values
}

function readEnvFile(): Record<string, string> {
  try {
    return parseEnvFile(readFileSync(ENV_PATH, "utf8"))
  } catch {
    return {}
  }
}

function port(values: Record<string, string>, key: string): number {
  const raw = process.env[key] ?? values[key]
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `${key} is missing or not a port in ${ENV_PATH} — run "make setup-env" first.`
    )
  }
  return parsed
}

export function readRepoEnv(): RepoEnv {
  const values = readEnvFile()
  return {
    vitePort: port(values, "VITE_PORT"),
    serverPort: port(values, "SERVER_PORT"),
  }
}

export function apiOrigin(): string {
  return `http://127.0.0.1:${String(readRepoEnv().serverPort)}`
}
