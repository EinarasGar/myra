import { QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { createElement, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createQueryClient, queryKeys } from "@/lib/query"

const getTransactions = vi.fn()
const getAccountTransactions = vi.fn()

vi.mock("@/lib/api", () => ({
  api: () => ({ getTransactions, getAccountTransactions }),
  apiClient: { get: vi.fn() },
}))

const {
  at,
  ACCOUNT_CURRENT,
  combinedPage,
  individualItem,
  regular,
  lookupTables,
} = await import("./fixtures")
const {
  accountLedgerInfiniteQueryOptions,
  combinedLedgerInfiniteQueryOptions,
  LEDGER_PAGE_SIZE,
  useLedger,
} = await import("./queries")

const USER = "00000000-0000-0000-0000-000000000000"

function wrapper(queryClient: ReturnType<typeof createQueryClient>) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeEach(() => {
  getTransactions.mockReset()
  getAccountTransactions.mockReset()
})

describe("query options", () => {
  it("keys the combined ledger by page size and query", () => {
    const options = combinedLedgerInfiniteQueryOptions({
      userId: USER,
      query: "tesco",
    })
    expect(options.queryKey).toEqual(
      queryKeys
        .user(USER)
        .transactions.combined({ limit: LEDGER_PAGE_SIZE, query: "tesco" })
    )
  })

  it("stops cursor paging when has_more is false", () => {
    const options = combinedLedgerInfiniteQueryOptions({
      userId: USER,
      query: undefined,
    })
    const page = combinedPage([], { has_more: false, next_cursor: "abc" })
    expect(
      options.getNextPageParam(page, [page], undefined, [])
    ).toBeUndefined()
  })

  it("stops cursor paging when the server omits the next cursor", () => {
    const options = combinedLedgerInfiniteQueryOptions({
      userId: USER,
      query: undefined,
    })
    const page = combinedPage([], { has_more: true, next_cursor: null })
    expect(
      options.getNextPageParam(page, [page], undefined, [])
    ).toBeUndefined()
  })

  it("keys the account listing under the account it belongs to", () => {
    const options = accountLedgerInfiniteQueryOptions({
      userId: USER,
      accountId: ACCOUNT_CURRENT,
    })
    expect(options.queryKey).toEqual(
      queryKeys.user(USER).accounts.transactions(ACCOUNT_CURRENT, {
        count: LEDGER_PAGE_SIZE,
      })
    )
  })
})

describe("useLedger", () => {
  it("reads the combined endpoint and normalises its rows", async () => {
    getTransactions.mockResolvedValue({
      data: combinedPage([individualItem(regular())]),
    })
    const queryClient = createQueryClient()

    const { result } = renderHook(() => useLedger({ userId: USER }), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1)
    })
    expect(result.current.source).toBe("combined")
    expect(at(result.current.rows, 0).description.primary).toBe("Tesco")
    expect(getTransactions).toHaveBeenCalledWith(
      USER,
      LEDGER_PAGE_SIZE,
      undefined,
      undefined,
      undefined,
      undefined,
      expect.anything()
    )
  })

  it("passes a text token through as the query param", async () => {
    getTransactions.mockResolvedValue({ data: combinedPage([]) })
    const queryClient = createQueryClient()

    renderHook(
      () =>
        useLedger({ userId: USER, tokens: [{ key: "text", value: "tesco" }] }),
      { wrapper: wrapper(queryClient) }
    )

    await waitFor(() => {
      expect(getTransactions).toHaveBeenCalled()
    })
    expect(at(at(getTransactions.mock.calls, 0), 5)).toBe("tesco")
  })

  it("switches to the per-account listing and never calls the combined endpoint", async () => {
    getAccountTransactions.mockResolvedValue({
      data: {
        results: [regular()],
        total_results: 1,
        lookup_tables: lookupTables,
      },
    })
    const queryClient = createQueryClient()

    const { result } = renderHook(
      () =>
        useLedger({
          userId: USER,
          tokens: [
            {
              key: "account",
              accountId: ACCOUNT_CURRENT,
              label: "Lloyds Current",
            },
          ],
        }),
      { wrapper: wrapper(queryClient) }
    )

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1)
    })
    expect(result.current.source).toBe("account")
    expect(result.current.totalResults).toBe(1)
    expect(getTransactions).not.toHaveBeenCalled()
  })

  it("never sends a text token to the account listing that would discard it", async () => {
    getAccountTransactions.mockResolvedValue({
      data: {
        results: [regular()],
        total_results: 1,
        lookup_tables: lookupTables,
      },
    })
    const queryClient = createQueryClient()

    const { result } = renderHook(
      () =>
        useLedger({
          userId: USER,
          tokens: [
            { key: "text", value: "tesco" },
            {
              key: "account",
              accountId: ACCOUNT_CURRENT,
              label: "Lloyds Current",
            },
          ],
        }),
      { wrapper: wrapper(queryClient) }
    )

    await waitFor(() => {
      expect(getAccountTransactions).toHaveBeenCalled()
    })
    expect(getAccountTransactions).toHaveBeenCalledWith(
      USER,
      ACCOUNT_CURRENT,
      LEDGER_PAGE_SIZE,
      0,
      undefined,
      expect.anything()
    )
    expect(result.current.plan.query).toBeUndefined()
    expect(result.current.plan.unsupportedTokens).toEqual([
      { key: "text", value: "tesco" },
    ])
  })

  it("distinguishes an empty ledger from an empty filtered slice", async () => {
    getTransactions.mockResolvedValue({ data: combinedPage([]) })
    const queryClient = createQueryClient()

    const plain = renderHook(() => useLedger({ userId: USER }), {
      wrapper: wrapper(queryClient),
    })
    await waitFor(() => {
      expect(plain.result.current.isEmpty).toBe(true)
    })
    expect(plain.result.current.isEmptyBecauseFiltered).toBe(false)

    const filtered = renderHook(
      () =>
        useLedger({
          userId: USER,
          tokens: [{ key: "category", categoryId: 7, label: "Groceries" }],
        }),
      { wrapper: wrapper(queryClient) }
    )
    await waitFor(() => {
      expect(filtered.result.current.isEmpty).toBe(true)
    })
    expect(filtered.result.current.isEmptyBecauseFiltered).toBe(true)
    expect(filtered.result.current.plan.hasUnsupportedTokens).toBe(true)
  })

  it("reads the account listing's no-results 500 as an empty account, not a failure", async () => {
    getAccountTransactions.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          error_type: "InternalServerError",
          message: "An internal server error occurred.",
          errors: [],
          stack_trace: "No results found",
        },
      },
    })
    const queryClient = createQueryClient()

    const { result } = renderHook(
      () =>
        useLedger({
          userId: USER,
          tokens: [
            {
              key: "account",
              accountId: ACCOUNT_CURRENT,
              label: "Lloyds Current",
            },
          ],
        }),
      { wrapper: wrapper(queryClient) }
    )

    await waitFor(() => {
      expect(result.current.isEmpty).toBe(true)
    })
    expect(result.current.isError).toBe(false)
    expect(result.current.totalResults).toBe(0)
  })

  it("still throws a genuine account listing failure", async () => {
    getAccountTransactions.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          error_type: "InternalServerError",
          message: "An internal server error occurred.",
          errors: [],
          stack_trace: "connection reset",
        },
      },
    })
    const options = accountLedgerInfiniteQueryOptions({
      userId: USER,
      accountId: ACCOUNT_CURRENT,
    })

    const fetchPage = options.queryFn as (context: never) => Promise<unknown>

    await expect(
      fetchPage({
        pageParam: 0,
        queryKey: options.queryKey,
        signal: new AbortController().signal,
      } as never)
    ).rejects.toMatchObject({ kind: "serverError" })
  })

  it("counts the unreviewed rows it has actually loaded", async () => {
    const { ghostTransfer } = await import("./fixtures")
    getTransactions.mockResolvedValue({
      data: combinedPage([
        individualItem(regular()),
        individualItem(ghostTransfer()),
      ]),
    })
    const queryClient = createQueryClient()

    const { result } = renderHook(() => useLedger({ userId: USER }), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(2)
    })
    expect(result.current.unreviewedLoadedCount).toBe(1)
  })
})
