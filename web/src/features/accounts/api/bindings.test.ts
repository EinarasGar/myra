import { describe, expect, it } from "vitest"

import type { ConnectorBinding, GetBindingsResponse } from "@/api"

import {
  buildAccountConnectors,
  connectorStatusWord,
  toAccountConnector,
  toBindingStatus,
} from "./bindings"

function binding(overrides: Partial<ConnectorBinding> = {}): ConnectorBinding {
  return {
    id: "binding-1",
    connection_id: "connection-1",
    sverto_account_id: "account-1",
    provider_account_id: "provider-1",
    status: "active",
    write_mode: "ghost",
    created_at: 1_700_000_000,
    updated_at: 1_700_000_000,
    ...overrides,
  }
}

describe("toBindingStatus", () => {
  it.each(["pending", "active", "paused", "error", "revoked"])(
    "keeps the known status %s",
    (status) => {
      expect(toBindingStatus(status)).toBe(status)
    }
  )

  it("marks a state it does not know as unknown rather than guessing pending", () => {
    expect(toBindingStatus("quiescent")).toBe("unknown")
  })
})

describe("connectorStatusWord", () => {
  it("uses only the shared status words", () => {
    const words = new Set([
      connectorStatusWord("pending", false),
      connectorStatusWord("active", false),
      connectorStatusWord("active", true),
      connectorStatusWord("paused", false),
      connectorStatusWord("error", false),
      connectorStatusWord("revoked", false),
      connectorStatusWord("unknown", false),
    ])
    expect([...words].sort()).toEqual([
      "active",
      "needsAttention",
      "paused",
      "pending",
    ])
  })

  it("lets a failed run beat an otherwise active binding", () => {
    expect(connectorStatusWord("active", true)).toBe("needsAttention")
    expect(connectorStatusWord("active", false)).toBe("active")
  })

  it("never renders a state it cannot vouch for as quiet", () => {
    expect(connectorStatusWord("revoked", false)).toBe("needsAttention")
    expect(connectorStatusWord("unknown", false)).toBe("needsAttention")
  })
})

describe("toAccountConnector", () => {
  it("turns unix seconds into epoch milliseconds", () => {
    const connector = toAccountConnector(
      binding({ last_sync_at: 1_700_000_500, synced_through: 1_699_000_000 })
    )
    expect(connector.createdAt).toBe(1_700_000_000_000)
    expect(connector.lastSyncAt).toBe(1_700_000_500_000)
    expect(connector.syncedThrough).toBe(1_699_000_000_000)
  })

  it("reads a never-synced binding as null, not zero", () => {
    const connector = toAccountConnector(binding())
    expect(connector.lastSyncAt).toBeNull()
    expect(connector.syncedThrough).toBeNull()
    expect(connector.lastSyncError).toBeNull()
  })

  it("marks trusted write mode", () => {
    expect(toAccountConnector(binding()).writesPostDirectly).toBe(false)
    expect(
      toAccountConnector(binding({ write_mode: "trusted" })).writesPostDirectly
    ).toBe(true)
  })
})

describe("buildAccountConnectors", () => {
  const response: GetBindingsResponse = {
    bindings: [
      binding({
        id: "old",
        sverto_account_id: "account-1",
        created_at: 1_000,
        status: "revoked",
      }),
      binding({
        id: "new",
        sverto_account_id: "account-1",
        created_at: 2_000,
        status: "active",
      }),
      binding({
        id: "other",
        sverto_account_id: "account-2",
        created_at: 1_500,
        status: "error",
      }),
    ],
  }

  it("gives an account its newest binding", () => {
    const view = buildAccountConnectors(response)
    expect(view.byAccountId["account-1"]?.bindingId).toBe("new")
    expect(view.byAccountId["account-1"]?.statusWord).toBe("active")
  })

  it("counts every binding, not every account", () => {
    const view = buildAccountConnectors(response)
    expect(view.count).toBe(3)
    expect(Object.keys(view.byAccountId)).toHaveLength(2)
  })

  it("counts every binding that needs attention, superseded ones included", () => {
    expect(buildAccountConnectors(response).needsAttentionCount).toBe(2)
  })

  it("has no entry for an account with no binding", () => {
    expect(
      buildAccountConnectors({ bindings: [] }).byAccountId["account-1"]
    ).toBeUndefined()
  })
})
