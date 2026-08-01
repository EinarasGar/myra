import { describe, expect, it } from "vitest"

import type { AiUsageResponse, ConnectorBinding } from "@/api"
import { buildAccountConnectors } from "@/features/accounts/api"

import {
  buildConnections,
  connectionStatusWord,
  toConnectionStatus,
} from "./connections"
import { buildAiUsage, quotaTone } from "./usage"

function usage(overrides: Partial<AiUsageResponse> = {}): AiUsageResponse {
  return {
    hourly: {
      input: { used: 38_420, limit: 120_000 },
      output: { used: 6_180, limit: 20_000 },
      reset_at: "2026-07-31T12:24:00Z",
    },
    monthly: {
      input: { used: 2_412_880, limit: 4_000_000 },
      output: { used: 412_400, limit: 600_000 },
      reset_at: "2026-08-01T00:00:00Z",
    },
    ...overrides,
  }
}

function binding(overrides: Partial<ConnectorBinding> = {}): ConnectorBinding {
  return {
    id: "b1",
    connection_id: "c1",
    provider_account_id: "pa1",
    sverto_account_id: "a1",
    status: "active",
    write_mode: "ghost",
    created_at: 1_700_000_000,
    updated_at: 1_700_000_000,
    ...overrides,
  }
}

describe("buildAiUsage", () => {
  it("keeps used and limit apart and derives the share", () => {
    const view = buildAiUsage(usage())
    const hourly = view.windows[0]
    expect(hourly?.id).toBe("hourly")
    expect(hourly?.input.used).toBe(38_420)
    expect(hourly?.input.limit).toBe(120_000)
    expect(hourly?.input.ratio).toBeCloseTo(0.3202, 4)
  })

  it("refuses a share of zero rather than reading 0%", () => {
    const view = buildAiUsage(
      usage({
        hourly: {
          input: { used: 0, limit: 0 },
          output: { used: 0, limit: 0 },
          reset_at: "2026-07-31T12:24:00Z",
        },
      })
    )
    expect(view.windows[0]?.input.ratio).toBeNull()
    expect(view.windows[0]?.peakRatio).toBeNull()
  })

  it("turns an unparseable reset stamp into null, never NaN", () => {
    const view = buildAiUsage(
      usage({
        hourly: {
          input: { used: 1, limit: 2 },
          output: { used: 1, limit: 2 },
          reset_at: "not a date",
        },
      })
    )
    expect(view.windows[0]?.resetAt).toBeNull()
  })

  it("reports the worst bar across both windows", () => {
    const view = buildAiUsage(usage())
    expect(view.peakRatio).toBeCloseTo(412_400 / 600_000, 6)
  })
})

describe("quotaTone", () => {
  it("stays brand while there is room and escalates as it fills", () => {
    expect(quotaTone(null)).toBe("brand")
    expect(quotaTone(0.32)).toBe("brand")
    expect(quotaTone(0.69)).toBe("attention")
    expect(quotaTone(0.95)).toBe("negative")
  })
})

describe("connection status", () => {
  it("maps an unrecognised server status to a state the UI shouts about", () => {
    expect(toConnectionStatus("something-new")).toBe("unknown")
    expect(connectionStatusWord("unknown")).toBe("needsAttention")
  })

  it("never renders a revoked connection as quiet", () => {
    expect(connectionStatusWord("revoked")).toBe("needsAttention")
    expect(connectionStatusWord("error")).toBe("needsAttention")
  })

  it("keeps pending, paused and active distinct", () => {
    expect(connectionStatusWord("pending_oauth")).toBe("pending")
    expect(connectionStatusWord("paused")).toBe("paused")
    expect(connectionStatusWord("active")).toBe("active")
  })
})

describe("buildConnections", () => {
  const connectors = buildAccountConnectors({
    bindings: [
      binding({ id: "b1", connection_id: "c1", last_sync_at: 1_700_000_500 }),
      binding({
        id: "b2",
        connection_id: "c1",
        provider_account_id: "pa2",
        sverto_account_id: "a2",
        status: "error",
        last_sync_at: 1_700_000_900,
      }),
      binding({ id: "b3", connection_id: "c2", provider_account_id: "pa3" }),
    ],
  })

  const view = buildConnections(
    {
      connections: [
        {
          id: "c1",
          provider_kind: "truelayer",
          credential_mode: "stored",
          status: "active",
          created_at: 1_699_000_000,
          updated_at: 1_699_000_000,
          consent_expires_at: 1_800_000_000,
        },
        {
          id: "c2",
          provider_kind: "trading212",
          credential_mode: "stored",
          status: "revoked",
          created_at: 1_699_500_000,
          updated_at: 1_699_500_000,
        },
      ],
    },
    connectors
  )

  it("attaches each binding to the connection that owns it", () => {
    expect(view.byId.c1?.bindings.map((b) => b.bindingId)).toEqual(["b1", "b2"])
    expect(view.byId.c2?.bindings.map((b) => b.bindingId)).toEqual(["b3"])
  })

  it("counts connections per provider so a card can say how many", () => {
    expect(view.countByProvider).toEqual({ truelayer: 1, trading212: 1 })
    expect(view.count).toBe(2)
  })

  it("reads the newest sync across a connection's bindings, in milliseconds", () => {
    expect(view.byId.c1?.lastSyncAt).toBe(1_700_000_900 * 1000)
  })

  it("leaves lastSyncAt null when nothing on the connection has ever run", () => {
    expect(view.byId.c2?.lastSyncAt).toBeNull()
  })

  it("carries the provider account id a binding reads, so bindings can be joined", () => {
    expect(view.byId.c1?.bindings.map((b) => b.providerAccountId)).toEqual([
      "pa1",
      "pa2",
    ])
  })

  it("surfaces a failing binding as a count the rail can badge", () => {
    expect(view.byId.c1?.needsAttentionCount).toBe(1)
    expect(view.needsAttentionCount).toBe(1)
  })

  it("converts consent expiry to milliseconds and null when absent", () => {
    expect(view.byId.c1?.consentExpiresAt).toBe(1_800_000_000 * 1000)
    expect(view.byId.c2?.consentExpiresAt).toBeNull()
  })

  it("names the provider from the frontend catalogue", () => {
    expect(view.byId.c1?.providerLabel).toBe("TrueLayer")
    expect(view.byId.c2?.providerLabel).toBe("Trading 212")
  })
})
