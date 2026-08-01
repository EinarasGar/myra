import { useMutation, useQueryClient } from "@tanstack/react-query"

import type {
  AddTransactionGroupResponse,
  GroupTransactionItem,
  RequiredIdentifiableTransaction,
  TransactionWithEntryIds,
  UpdateTransactionGroupResponse,
  UpdateTransactionResponse,
} from "@/api"
import {
  IndividualTransactionsApiFactory,
  TransactionGroupsApiFactory,
  TransactionsApiFactory,
} from "@/api"
import { api } from "@/lib/api"
import type {
  CategoryId,
  TransactionGroupId,
  TransactionId,
  UserId,
} from "@/lib/query"
import { mutationKeys, queryKeys } from "@/lib/query"

import { removeTransactionsFromCache, setVisibilityInCache } from "./cache"
import {
  collapseIntoGroupInCache,
  detachFromGroupInCache,
  updateGroupInCache,
} from "./group-cache"
import { prefixOptimisticMutationOptions } from "./optimistic"
import type {
  VisibilityIntent,
  VisibilityPlan,
  VisibilitySubject,
} from "./visibility"
import { planVisibility } from "./visibility"

function ledgerPrefixes(userId: UserId) {
  return [
    queryKeys.user(userId).transactions.all(),
    queryKeys.user(userId).accounts.all(),
  ]
}

function derivedFigures(userId: UserId) {
  return [queryKeys.user(userId).portfolio.all()]
}

export interface DeleteTransactionsVariables {
  readonly transactionIds?: readonly TransactionId[]
  readonly groupIds?: readonly TransactionGroupId[]
}

export function useDeleteTransactions(userId: UserId) {
  const queryClient = useQueryClient()

  return useMutation(
    prefixOptimisticMutationOptions<void, DeleteTransactionsVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).transactions(),
      mutationFn: async (variables) => {
        await api(TransactionsApiFactory).deleteMultipleTransactionsAndGroups(
          userId,
          {
            transaction_ids: [...(variables.transactionIds ?? [])],
            group_ids: [...(variables.groupIds ?? [])],
          }
        )
      },
      prefixes: ledgerPrefixes(userId),
      apply: (previous, variables) =>
        removeTransactionsFromCache(
          previous,
          new Set(variables.transactionIds ?? []),
          new Set(variables.groupIds ?? [])
        ),
      invalidate: derivedFigures(userId),
    })
  )
}

export interface DeleteTransactionVariables {
  readonly transactionId: TransactionId
}

export function useDeleteTransaction(userId: UserId) {
  const queryClient = useQueryClient()

  return useMutation(
    prefixOptimisticMutationOptions<void, DeleteTransactionVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).transactions(),
      mutationFn: async (variables) => {
        await api(TransactionsApiFactory).deleteAnExistingTransaction(
          variables.transactionId,
          userId
        )
      },
      prefixes: ledgerPrefixes(userId),
      apply: (previous, variables) =>
        removeTransactionsFromCache(
          previous,
          new Set([variables.transactionId]),
          new Set()
        ),
      invalidate: derivedFigures(userId),
    })
  )
}

export interface DeleteTransactionGroupVariables {
  readonly groupId: TransactionGroupId
}

export function useDeleteTransactionGroup(userId: UserId) {
  const queryClient = useQueryClient()

  return useMutation(
    prefixOptimisticMutationOptions<void, DeleteTransactionGroupVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).transactions(),
      mutationFn: async (variables) => {
        await api(TransactionGroupsApiFactory).deleteAnExistingTransactionGroup(
          variables.groupId,
          userId
        )
      },
      prefixes: ledgerPrefixes(userId),
      apply: (previous, variables) =>
        removeTransactionsFromCache(
          previous,
          new Set(),
          new Set([variables.groupId])
        ),
      invalidate: derivedFigures(userId),
    })
  )
}

export interface ApplyVisibilityVariables {
  readonly subjects: readonly VisibilitySubject[]
  readonly intent: VisibilityIntent
}

export interface ApplyVisibilityOptions {
  readonly onSuccess?: (plan: VisibilityPlan) => void
}

function applyPlanToCache(
  previous: unknown,
  variables: ApplyVisibilityVariables
): unknown {
  return planVisibility(variables.subjects, variables.intent).writes.reduce(
    (data, write) =>
      setVisibilityInCache(
        data,
        new Set(write.transactionIds),
        write.visibility
      ),
    previous
  )
}

/**
 * Every visibility write in the app goes through `applyIntent`, so the tri-state can only ever
 * move along a transition the plan allows; there is no parameter through which a caller could
 * name a target visibility directly.
 */
export function useApplyVisibility(userId: UserId) {
  const queryClient = useQueryClient()

  const mutation = useMutation(
    prefixOptimisticMutationOptions<void, ApplyVisibilityVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).transactions(),
      mutationFn: async (variables) => {
        const plan = planVisibility(variables.subjects, variables.intent)
        for (const write of plan.writes) {
          await api(
            TransactionsApiFactory
          ).setVisibilityForMultipleTransactions(userId, {
            transaction_ids: [...write.transactionIds],
            visibility: write.visibility,
          })
        }
      },
      prefixes: ledgerPrefixes(userId),
      apply: applyPlanToCache,
      invalidate: derivedFigures(userId),
    })
  )

  return {
    ...mutation,
    applyIntent: (
      subjects: readonly VisibilitySubject[],
      intent: VisibilityIntent,
      options: ApplyVisibilityOptions = {}
    ): VisibilityPlan => {
      const plan = planVisibility(subjects, intent)
      if (plan.writes.length === 0) return plan
      const { onSuccess } = options
      mutation.mutate(
        { subjects, intent },
        onSuccess === undefined
          ? {}
          : {
              onSuccess: () => {
                onSuccess(plan)
              },
            }
      )
      return plan
    },
  }
}

export interface GroupTransactionsVariables {
  /**
   * Minted by the caller, not the server. `apply` runs once per cached query and has to
   * paint the same provisional row into all of them, so the id cannot be generated here.
   */
  readonly provisionalGroupId: TransactionGroupId
  readonly categoryId: CategoryId
  readonly date: number
  readonly description: string
  readonly transactions: readonly RequiredIdentifiableTransaction[]
}

function groupPayload(variables: {
  readonly categoryId: CategoryId
  readonly date: number
  readonly description: string
  readonly transactions: readonly RequiredIdentifiableTransaction[]
}) {
  return {
    category_id: variables.categoryId,
    date: variables.date,
    description: variables.description,
    transactions: [...variables.transactions],
  }
}

function provisionalGroupItem(
  variables: GroupTransactionsVariables
): GroupTransactionItem {
  return {
    item_type: "group",
    group_id: variables.provisionalGroupId,
    category_id: variables.categoryId,
    date: variables.date,
    description: variables.description,
    transactions: [...variables.transactions],
  }
}

export function useGroupTransactions(userId: UserId) {
  const queryClient = useQueryClient()

  return useMutation(
    prefixOptimisticMutationOptions<
      AddTransactionGroupResponse,
      GroupTransactionsVariables
    >({
      queryClient,
      mutationKey: mutationKeys.user(userId).transactions(),
      mutationFn: async (variables) => {
        const response = await api(
          TransactionGroupsApiFactory
        ).groupIndividualTransactions(userId, groupPayload(variables))
        return response.data
      },
      prefixes: ledgerPrefixes(userId),
      apply: (previous, variables) =>
        collapseIntoGroupInCache(previous, provisionalGroupItem(variables)),
      invalidate: derivedFigures(userId),
    })
  )
}

export interface UpdateTransactionGroupVariables {
  /**
   * The whole group as it should end up, membership included. The server treats
   * `transactions` as the complete set and deletes any current member missing from it, so
   * every caller — one adding members, one editing only the description — sends the children
   * back with it.
   */
  readonly group: GroupTransactionItem
}

export function useUpdateTransactionGroup(userId: UserId) {
  const queryClient = useQueryClient()

  return useMutation(
    prefixOptimisticMutationOptions<
      UpdateTransactionGroupResponse,
      UpdateTransactionGroupVariables
    >({
      queryClient,
      mutationKey: mutationKeys.user(userId).transactions(),
      mutationFn: async (variables) => {
        const response = await api(
          TransactionGroupsApiFactory
        ).updateTransactionGroup(
          variables.group.group_id,
          userId,
          groupPayload({
            categoryId: variables.group.category_id,
            date: variables.group.date,
            description: variables.group.description,
            transactions: variables.group.transactions,
          })
        )
        return response.data
      },
      prefixes: ledgerPrefixes(userId),
      apply: (previous, variables) =>
        updateGroupInCache(previous, variables.group),
      invalidate: derivedFigures(userId),
    })
  )
}

export type AddToGroupVariables = UpdateTransactionGroupVariables

export const useAddToGroup = useUpdateTransactionGroup

export interface RemoveFromGroupVariables {
  readonly groupId: TransactionGroupId
  readonly transaction: RequiredIdentifiableTransaction
}

/**
 * `PUT /transactions/individual/{id}` is the move-out: it rewrites the transaction from the
 * body and then clears its group id, so the body has to be the transaction exactly as it
 * already is or the round trip would edit it on the way out.
 */
export function useRemoveFromGroup(userId: UserId) {
  const queryClient = useQueryClient()

  return useMutation(
    prefixOptimisticMutationOptions<
      UpdateTransactionResponse,
      RemoveFromGroupVariables
    >({
      queryClient,
      mutationKey: mutationKeys.user(userId).transactions(),
      mutationFn: async (variables) => {
        const { transaction_id: _id, ...body } = variables.transaction
        const response = await api(
          IndividualTransactionsApiFactory
        ).updateAnExistingIndividualTransaction(
          userId,
          variables.transaction.transaction_id,
          { transaction: body as unknown as TransactionWithEntryIds }
        )
        return response.data
      },
      prefixes: ledgerPrefixes(userId),
      apply: (previous, variables) =>
        detachFromGroupInCache(previous, {
          groupId: variables.groupId,
          transaction: variables.transaction,
        }),
      invalidate: derivedFigures(userId),
    })
  )
}
