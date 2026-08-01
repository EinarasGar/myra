import type { QueryKey } from "@tanstack/react-query"
import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { optimisticMutationOptions, optimisticUpdate } from "./optimistic"

interface Account {
  id: string
  name: string
}

const LIST_KEY = ["accounts"] as const

function seededClient(accounts: Account[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData<Account[]>(LIST_KEY, accounts)
  return client
}

type RenameVariables = { id: string; name: string }

function renameUpdate(
  queryClient: QueryClient,
  overrides: {
    mutationFn?: (variables: RenameVariables) => Promise<Account>
    invalidate?: QueryKey[]
  } = {}
) {
  return optimisticMutationOptions<Account, RenameVariables>({
    queryClient,
    mutationKey: ["mutate-accounts"],
    mutationFn:
      overrides.mutationFn ??
      ((variables) =>
        Promise.resolve({ id: variables.id, name: variables.name })),
    ...(overrides.invalidate === undefined
      ? {}
      : { invalidate: overrides.invalidate }),
    updates: [
      optimisticUpdate<Account[], RenameVariables>(
        LIST_KEY,
        (previous, variables) =>
          previous?.map((account) =>
            account.id === variables.id
              ? { ...account, name: variables.name }
              : account
          )
      ),
    ],
  })
}

async function run<TData, TVariables>(
  queryClient: QueryClient,
  options: ReturnType<typeof optimisticMutationOptions<TData, TVariables>>,
  variables: TVariables
) {
  const mutation = queryClient.getMutationCache().build(queryClient, options)
  return mutation.execute(variables)
}

describe("optimisticMutationOptions", () => {
  it("applies the update before the request resolves", async () => {
    const queryClient = seededClient([{ id: "a", name: "Main Current" }])

    let observedDuringRequest: Account[] | undefined
    const options = renameUpdate(queryClient, {
      mutationFn: (variables) => {
        observedDuringRequest = queryClient.getQueryData<Account[]>(LIST_KEY)
        return Promise.resolve({ id: variables.id, name: variables.name })
      },
    })

    await run(queryClient, options, { id: "a", name: "Renamed" })

    expect(observedDuringRequest).toEqual([{ id: "a", name: "Renamed" }])
  })

  it("rolls back to the snapshot when the request fails", async () => {
    const queryClient = seededClient([{ id: "a", name: "Main Current" }])
    const options = renameUpdate(queryClient, {
      mutationFn: () => Promise.reject(new Error("boom")),
    })

    await expect(
      run(queryClient, options, { id: "a", name: "Renamed" })
    ).rejects.toBeTruthy()

    expect(queryClient.getQueryData<Account[]>(LIST_KEY)).toEqual([
      { id: "a", name: "Main Current" },
    ])
  })

  it("normalizes the rejection reason", async () => {
    const queryClient = seededClient([])
    const options = renameUpdate(queryClient, {
      mutationFn: () => Promise.reject(new Error("boom")),
    })

    await expect(
      run(queryClient, options, { id: "a", name: "Renamed" })
    ).rejects.toMatchObject({ kind: "unknown" })
  })

  it("invalidates the touched keys once settled", async () => {
    const queryClient = seededClient([{ id: "a", name: "Main Current" }])
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    await run(queryClient, renameUpdate(queryClient), {
      id: "a",
      name: "Renamed",
    })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: LIST_KEY })
  })

  it("also invalidates explicitly listed related keys", async () => {
    const queryClient = seededClient([{ id: "a", name: "Main Current" }])
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const options = renameUpdate(queryClient, { invalidate: [["portfolio"]] })

    await run(queryClient, options, { id: "a", name: "Renamed" })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["portfolio"] })
  })

  it("suppresses invalidation until the last mutation of the group settles", async () => {
    const queryClient = seededClient([
      { id: "a", name: "Main Current" },
      { id: "b", name: "Savings" },
    ])
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    const deferred: Array<() => void> = []
    const options = renameUpdate(queryClient, {
      mutationFn: (variables) =>
        new Promise<Account>((resolve) => {
          deferred.push(() =>
            resolve({ id: variables.id, name: variables.name })
          )
        }),
    })

    const first = run(queryClient, options, { id: "a", name: "One" })
    const second = run(queryClient, options, { id: "b", name: "Two" })

    await vi.waitFor(() => expect(deferred).toHaveLength(2))
    deferred[0]?.()
    await first
    expect(invalidate).not.toHaveBeenCalled()

    deferred[1]?.()
    await second
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LIST_KEY })
  })
})
