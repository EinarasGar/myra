import { describe, expect, it } from "vitest"

import type { ConnectorBinding } from "@/api"
import { buildAccountConnectors } from "@/features/accounts/api"

import { buildAccountSyncIndex, isSyncTrouble } from "./sync-status"

function binding(overrides: Partial<ConnectorBinding> = {}): ConnectorBinding {
  return {
    connection_id: "connection",
    created_at: 0,
    id: "binding",
    provider_account_id: "provider",
    status: "active",
    sverto_account_id: "account-1",
    updated_at: 0,
    write_mode: "review",
    ...overrides,
  }
}

function index(bindings: ConnectorBinding[]) {
  return buildAccountSyncIndex(buildAccountConnectors({ bindings }))
}

describe("buildAccountSyncIndex", () => {
  it("keys the status by the Sverto account it affects", () => {
    expect(
      index([
        binding({ sverto_account_id: "a", status: "active" }),
        binding({ sverto_account_id: "b", status: "paused" }),
      ])
    ).toEqual({ a: "active", b: "paused" })
  })

  it("reads the same word the accounts screen shows for that account", () => {
    const connectors = buildAccountConnectors({
      bindings: [
        binding({ sverto_account_id: "a", status: "revoked" }),
        binding({ sverto_account_id: "b", status: "quantum" }),
      ],
    })
    const words = buildAccountSyncIndex(connectors)

    expect(words["a"]).toBe(connectors.byAccountId["a"]?.statusWord)
    expect(words["b"]).toBe(connectors.byAccountId["b"]?.statusWord)
    expect(words).toEqual({ a: "needsAttention", b: "needsAttention" })
  })

  it("follows the binding that governs the account when there are several", () => {
    expect(
      index([
        binding({ id: "old", created_at: 1_000, status: "error" }),
        binding({ id: "new", created_at: 2_000, status: "active" }),
      ])["account-1"]
    ).toBe("active")
  })

  it("does not invent a status for an account with no binding", () => {
    expect(index([])["a"]).toBeUndefined()
  })
})

describe("isSyncTrouble", () => {
  it("stays silent for a healthy or unlinked account", () => {
    expect(isSyncTrouble("active")).toBe(false)
    expect(isSyncTrouble(undefined)).toBe(false)
  })

  it("speaks for anything the user may need to act on", () => {
    expect(isSyncTrouble("needsAttention")).toBe(true)
    expect(isSyncTrouble("pending")).toBe(true)
    expect(isSyncTrouble("paused")).toBe(true)
  })
})
