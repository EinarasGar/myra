import { Suspense, type ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ConnectorBinding } from "@/api"
import { createQueryClient } from "@/lib/query"

const listBindings = vi.fn()

vi.mock("@/lib/api", () => ({
  api: () => ({ listBindings }),
  apiClient: { get: vi.fn() },
}))

const { useAccountConnectorsSuspense } = await import("./bindings")
const { useAccountSync } = await import("@/features/dashboard/api/sync-status")

const USER = "00000000-0000-0000-0000-000000000000"

function binding(overrides: Partial<ConnectorBinding>): ConnectorBinding {
  return {
    id: "binding",
    connection_id: "connection",
    sverto_account_id: "a1",
    provider_account_id: "provider",
    status: "active",
    write_mode: "review",
    created_at: 1_700_000_000,
    updated_at: 1_700_000_000,
    ...overrides,
  }
}

const BINDINGS = [
  binding({ id: "b1", sverto_account_id: "a1", status: "revoked" }),
  binding({ id: "b2", sverto_account_id: "a2", status: "active" }),
]

function wrapper(client: ReturnType<typeof createQueryClient>) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <Suspense fallback={null}>{children}</Suspense>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  listBindings.mockReset()
  listBindings.mockResolvedValue({ data: { bindings: BINDINGS } })
})

describe("the connector cache node", () => {
  it("serves the accounts view after the dashboard mounted first", async () => {
    const client = createQueryClient()
    const wrap = wrapper(client)

    const dashboard = renderHook(() => useAccountSync(USER), { wrapper: wrap })
    await waitFor(() => {
      expect(dashboard.result.current["a1"]).toBeDefined()
    })

    const accounts = renderHook(() => useAccountConnectorsSuspense(USER), {
      wrapper: wrap,
    })
    await waitFor(() => {
      expect(accounts.result.current.count).toBe(2)
    })

    expect(accounts.result.current.byAccountId["a1"]?.bindingId).toBe("b1")
    expect(listBindings).toHaveBeenCalledTimes(1)
  })

  it("keeps the dashboard dots after the accounts screen mounted first", async () => {
    const client = createQueryClient()
    const wrap = wrapper(client)

    const accounts = renderHook(() => useAccountConnectorsSuspense(USER), {
      wrapper: wrap,
    })
    await waitFor(() => {
      expect(accounts.result.current.count).toBe(2)
    })

    const dashboard = renderHook(() => useAccountSync(USER), { wrapper: wrap })
    await waitFor(() => {
      expect(dashboard.result.current["a1"]).toBeDefined()
    })

    expect(dashboard.result.current).toEqual({
      a1: "needsAttention",
      a2: "active",
    })
    expect(listBindings).toHaveBeenCalledTimes(1)
  })

  it("gives both screens the same word for the same account", async () => {
    const client = createQueryClient()
    const wrap = wrapper(client)

    const accounts = renderHook(() => useAccountConnectorsSuspense(USER), {
      wrapper: wrap,
    })
    const dashboard = renderHook(() => useAccountSync(USER), { wrapper: wrap })

    await waitFor(() => {
      expect(accounts.result.current.count).toBe(2)
      expect(dashboard.result.current["a1"]).toBeDefined()
    })

    for (const connector of accounts.result.current.connectors) {
      expect(dashboard.result.current[connector.accountId]).toBe(
        connector.statusWord
      )
    }
  })
})
