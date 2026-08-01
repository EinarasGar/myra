import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AssetsApiFactory } from "@/api"

const stubs = vi.hoisted(() => ({ searchAssets: vi.fn() }))

vi.mock("@/lib/api", () => ({
  api: (factory: unknown) =>
    factory === AssetsApiFactory ? { searchAssets: stubs.searchAssets } : {},
  apiClient: { get: vi.fn() },
}))

const { useAssetSearch } = await import("./use-asset-search")

const DEBOUNCE = 40

function page(start: number) {
  return {
    data: {
      results: [
        {
          asset_id: start + 1,
          ticker: `TICK${String(start)}`,
          name: "Apple Inc",
          asset_type: 2,
        },
      ],
      total_results: 3,
    },
  }
}

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  stubs.searchAssets.mockReset()
  stubs.searchAssets.mockImplementation((_count: number, start: number) =>
    Promise.resolve(page(start))
  )
})

describe("the asset search behind the picker", () => {
  it("issues one request for a burst of keystrokes, not one per keystroke", async () => {
    const { result } = renderHook(() => useAssetSearch(DEBOUNCE), {
      wrapper: wrapper(),
    })

    for (const query of ["a", "ap", "app", "appl", "apple"]) {
      act(() => {
        result.current.setQuery(query)
      })
    }

    await waitFor(() => {
      expect(result.current.assets.length).toBeGreaterThan(0)
    })
    expect(stubs.searchAssets).toHaveBeenCalledTimes(1)
    expect(stubs.searchAssets.mock.calls[0]?.[2]).toBe("apple")
  })

  it("asks for nothing until something is typed", async () => {
    const { result } = renderHook(() => useAssetSearch(DEBOUNCE), {
      wrapper: wrapper(),
    })

    act(() => {
      result.current.setQuery("   ")
    })
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE * 3))

    expect(stubs.searchAssets).not.toHaveBeenCalled()
    expect(result.current.assets).toEqual([])
  })

  it("reports more pages and loads them, so a search is never silently truncated", async () => {
    const { result } = renderHook(() => useAssetSearch(DEBOUNCE), {
      wrapper: wrapper(),
    })

    act(() => {
      result.current.setQuery("apple")
    })
    await waitFor(() => {
      expect(result.current.assets).toHaveLength(1)
    })
    expect(result.current.total).toBe(3)
    expect(result.current.hasMore).toBe(true)

    act(() => {
      result.current.loadMore()
    })
    await waitFor(() => {
      expect(result.current.assets).toHaveLength(2)
    })
    expect(stubs.searchAssets.mock.calls[1]?.[1]).toBe(1)
  })
})
