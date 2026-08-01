import type { TransactionVisibility } from "@/api"
import type { AccountId, CategoryId } from "@/lib/query"

import type { TransactionTypeTag } from "./types"

export type LedgerFilterToken =
  | { readonly key: "text"; readonly value: string }
  | {
      readonly key: "account"
      readonly accountId: AccountId
      readonly label: string
    }
  | {
      readonly key: "category"
      readonly categoryId: CategoryId
      readonly label: string
    }
  | {
      readonly key: "type"
      readonly transactionType: TransactionTypeTag
      readonly label: string
    }
  | { readonly key: "dateFrom"; readonly value: string }
  | { readonly key: "dateTo"; readonly value: string }
  | { readonly key: "amountMin"; readonly value: number }
  | { readonly key: "amountMax"; readonly value: number }
  | {
      readonly key: "visibility"
      readonly value: TransactionVisibility
    }

export type LedgerFilterKey = LedgerFilterToken["key"]

export interface LedgerFilterCapability {
  readonly support: "server" | "conditional" | "unsupported"
  readonly gap: string | null
  readonly note: string
}

export const LEDGER_FILTER_SUPPORT: Record<
  LedgerFilterKey,
  LedgerFilterCapability
> = {
  text: {
    support: "conditional",
    gap: "B5",
    note: "ILIKE on the stored description, which only regular transactions and groups have, so synthesised descriptions are not searchable. Executes on the combined stream only: the per-account listing accepts a query param and never reaches a search clause, so an account token demotes text to unsupported.",
  },
  account: {
    support: "server",
    gap: "B1",
    note: "Served by the per-account listing, which cannot search — it takes a query param and discards it — returns individual transactions only, never group rows, and carries no categories in its lookup tables. One account at a time.",
  },
  category: {
    support: "unsupported",
    gap: "B1",
    note: "No category filter exists at any layer, and twelve of the thirteen types do not expose a category at all.",
  },
  type: {
    support: "unsupported",
    gap: "B1",
    note: "transaction_type_ids reaches the DAL params but no handler ever sets it; the combined stream does not carry it at all.",
  },
  dateFrom: {
    support: "unsupported",
    gap: "B1",
    note: "date_from reaches the DAL params but no handler ever sets it; the combined stream does not carry it at all.",
  },
  dateTo: {
    support: "unsupported",
    gap: "B1",
    note: "date_to reaches the DAL params but no handler ever sets it; the combined stream does not carry it at all.",
  },
  amountMin: {
    support: "unsupported",
    gap: "B1",
    note: "No amount filter exists, and amounts are per-asset so a single threshold is ambiguous until D1 is resolved.",
  },
  amountMax: {
    support: "unsupported",
    gap: "B1",
    note: "No amount filter exists, and amounts are per-asset so a single threshold is ambiguous until D1 is resolved.",
  },
  visibility: {
    support: "unsupported",
    gap: "A2",
    note: "No visibility filter and no count-by-visibility; the review queue cannot be fetched as its own stream.",
  },
}

export interface LedgerQueryPlan {
  readonly source: "combined" | "account"
  readonly accountId: AccountId | null
  readonly query: string | undefined
  readonly appliedTokens: readonly LedgerFilterToken[]
  readonly unsupportedTokens: readonly LedgerFilterToken[]
  readonly isFiltered: boolean
  readonly hasUnsupportedTokens: boolean
}

/**
 * Splits the design's typed tokens into the ones the API can execute and the rest, which
 * screens must surface as unapplied. Silently dropping them would return rows that do not
 * match what the query bar says — which is why text is demoted under an account token: the
 * per-account listing takes a query param and never searches on it.
 */
export function planLedgerQuery(
  tokens: readonly LedgerFilterToken[] = []
): LedgerQueryPlan {
  const applied: LedgerFilterToken[] = []
  const unsupported: LedgerFilterToken[] = []
  let query: string | undefined
  let accountId: AccountId | null = null

  for (const token of tokens) {
    if (token.key === "account") {
      accountId = token.accountId
      break
    }
  }

  const canSearch = accountId === null
  let accountApplied = false

  for (const token of tokens) {
    if (token.key === "text") {
      const value = token.value.trim()
      if (value === "") continue
      if (canSearch && query === undefined) {
        query = value
        applied.push(token)
      } else {
        unsupported.push(token)
      }
      continue
    }

    if (token.key === "account") {
      if (accountApplied) {
        unsupported.push(token)
      } else {
        accountApplied = true
        applied.push(token)
      }
      continue
    }

    unsupported.push(token)
  }

  return {
    source: accountId === null ? "combined" : "account",
    accountId,
    query,
    appliedTokens: applied,
    unsupportedTokens: unsupported,
    isFiltered: applied.length > 0 || unsupported.length > 0,
    hasUnsupportedTokens: unsupported.length > 0,
  }
}

const VISIBILITY_LABELS: Record<TransactionVisibility, string> = {
  default: "reviewed",
  ghost: "unreviewed",
  hidden: "hidden",
}

export function tokenLabel(token: LedgerFilterToken): {
  key: string
  value: string
} {
  switch (token.key) {
    case "text":
      return { key: "text", value: token.value }
    case "account":
      return { key: "account", value: token.label }
    case "category":
      return { key: "is", value: token.label }
    case "type":
      return { key: "type", value: token.label }
    case "dateFrom":
      return { key: "from", value: token.value }
    case "dateTo":
      return { key: "to", value: token.value }
    case "amountMin":
      return { key: "min", value: String(token.value) }
    case "amountMax":
      return { key: "max", value: String(token.value) }
    case "visibility":
      return { key: "is", value: VISIBILITY_LABELS[token.value] }
  }
}
