import { apiOrigin } from "./env"

export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"

export const FIXTURE_PREFIX = "E2E fixture"

const REQUEST_TIMEOUT_MS = 8000

interface LedgerEntry {
  readonly account_id: string
  readonly asset_id: number
  readonly amount: number
}

interface LedgerResult {
  readonly transaction_id: string
  readonly description?: string | null
  readonly category_id?: number | null
  readonly entry?: LedgerEntry
}

interface LedgerPage {
  readonly results: readonly LedgerResult[]
  readonly total_results: number
}

interface AccountsPage {
  readonly accounts: readonly { readonly account_id: string }[]
}

interface HoldingsPage {
  readonly holdings: readonly { readonly asset_id: number }[]
}

async function call<T>(
  path: string,
  init?: RequestInit
): Promise<T | undefined> {
  try {
    const response = await fetch(`${apiOrigin()}${path}`, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) return undefined
    const text = await response.text()
    if (text === "") return undefined
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

async function callOk(path: string, init: RequestInit): Promise<boolean> {
  try {
    const response = await fetch(`${apiOrigin()}${path}`, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function isApiReachable(): Promise<boolean> {
  return (await call<unknown>("/api/auth/me")) !== undefined
}

export async function fetchLedgerPage(
  start: number,
  count: number
): Promise<LedgerPage | undefined> {
  return call<LedgerPage>(
    `/api/users/${DEFAULT_USER_ID}/transactions?start=${String(start)}&count=${String(count)}`
  )
}

export async function fetchAnyAccountId(): Promise<string | null> {
  const page = await call<AccountsPage>(
    `/api/users/${DEFAULT_USER_ID}/accounts`
  )
  return page?.accounts[0]?.account_id ?? null
}

export async function fetchAnyAssetId(): Promise<number | null> {
  const page = await call<HoldingsPage>(
    `/api/users/${DEFAULT_USER_ID}/portfolio/holdings`
  )
  return page?.holdings[0]?.asset_id ?? null
}

export interface SeedTemplate {
  readonly accountId: string
  readonly assetId: number
  readonly categoryId: number | null
}

export async function readSeedTemplate(): Promise<SeedTemplate | null> {
  const page = await fetchLedgerPage(0, 1)
  const entry = page?.results[0]?.entry
  if (entry === undefined) return null
  return {
    accountId: entry.account_id,
    assetId: entry.asset_id,
    categoryId: page?.results[0]?.category_id ?? null,
  }
}

export interface SeedRequest {
  readonly description: string
  readonly amount: number
  readonly daysAgo: number
  readonly ghost?: boolean
}

export async function createFixtureTransaction(
  template: SeedTemplate,
  request: SeedRequest
): Promise<string | null> {
  const date = Math.floor(Date.now() / 1000) - request.daysAgo * 86_400
  const created = await call<{ transaction: { transaction_id: string } }>(
    `/api/users/${DEFAULT_USER_ID}/transactions/individual`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction: {
          type: "regular",
          date,
          entry: {
            account_id: template.accountId,
            asset_id: template.assetId,
            amount: request.amount,
          },
          ...(template.categoryId === null
            ? {}
            : { category_id: template.categoryId }),
          description: `${FIXTURE_PREFIX} ${request.description}`,
        },
      }),
    }
  )
  const id = created?.transaction.transaction_id ?? null
  if (id !== null && request.ghost === true) {
    await callOk(
      `/api/users/${DEFAULT_USER_ID}/transactions/${id}/visibility`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "ghost" }),
      }
    )
  }
  return id
}

export async function deleteFixtureTransactions(): Promise<number> {
  let removed = 0
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const page = await fetchLedgerPage(0, 200)
    if (page === undefined) return removed
    const doomed = page.results.filter(
      (row) => row.description?.startsWith(FIXTURE_PREFIX) === true
    )
    if (doomed.length === 0) return removed
    for (const row of doomed) {
      const gone = await callOk(
        `/api/users/${DEFAULT_USER_ID}/transactions/${row.transaction_id}`,
        { method: "DELETE" }
      )
      if (gone) removed += 1
    }
  }
  return removed
}
