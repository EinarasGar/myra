import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { QueryClient, QueryKey } from "@tanstack/react-query"

import type {
  AddIndividualTransactionResponse,
  TransactionInput,
  TransactionWithEntryIds,
  UpdateTransactionResponse,
} from "@/api"
import { IndividualTransactionsApiFactory, TransactionsApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { NormalizedError } from "@/lib/errors"
import type { TransactionId, UserId } from "@/lib/query"
import { mutationKeys, queryKeys, withNormalizedErrors } from "@/lib/query"

import { prefixOptimisticMutationOptions } from "../../api"
import { replaceTransactionInCache } from "./cache"

function ledgerPrefixes(userId: UserId): QueryKey[] {
  return [
    queryKeys.user(userId).transactions.all(),
    queryKeys.user(userId).accounts.all(),
  ]
}

function derivedFigures(userId: UserId): QueryKey[] {
  return [queryKeys.user(userId).portfolio.all()]
}

/**
 * A create has no cursor position in the response, so there is no honest slot to put the new
 * row in; the refetch decides where it belongs. An update does have one — the row is already
 * on screen — so that one is patched in place.
 */
function invalidateLedger(queryClient: QueryClient, userId: UserId): void {
  for (const queryKey of [
    ...ledgerPrefixes(userId),
    ...derivedFigures(userId),
  ]) {
    void queryClient.invalidateQueries({ queryKey })
  }
}

export interface CreateTransactionVariables {
  readonly transaction: TransactionInput
}

export function useCreateTransaction(userId: UserId) {
  const queryClient = useQueryClient()

  return useMutation<
    AddIndividualTransactionResponse,
    NormalizedError,
    CreateTransactionVariables
  >({
    mutationKey: mutationKeys.user(userId).transactions(),
    mutationFn: (variables) =>
      withNormalizedErrors(async () => {
        const response = await api(
          IndividualTransactionsApiFactory
        ).addIndividualTransaction(userId, {
          transaction: variables.transaction,
        })
        return response.data
      }),
    onSuccess: () => {
      invalidateLedger(queryClient, userId)
    },
  })
}

export interface UpdateTransactionVariables {
  readonly transactionId: TransactionId
  readonly transaction: TransactionWithEntryIds
}

export function useUpdateTransaction(userId: UserId) {
  const queryClient = useQueryClient()

  return useMutation(
    prefixOptimisticMutationOptions<
      UpdateTransactionResponse,
      UpdateTransactionVariables
    >({
      queryClient,
      mutationKey: mutationKeys.user(userId).transactions(),
      mutationFn: async (variables) => {
        const response = await api(
          TransactionsApiFactory
        ).updateAnExistingTransaction(variables.transactionId, userId, {
          transaction: variables.transaction,
        })
        return response.data
      },
      prefixes: ledgerPrefixes(userId),
      apply: (previous, variables) =>
        replaceTransactionInCache(
          previous,
          variables.transactionId,
          variables.transaction
        ),
      invalidate: derivedFigures(userId),
    })
  )
}
