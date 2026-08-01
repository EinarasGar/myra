import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { UpdateAccount } from "@/api"
import { AccountsApiFactory } from "@/api"
import { api } from "@/lib/api"
import {
  ACCOUNT_CLASS_LABELS,
  ACCOUNT_CLASS_ORDER,
  classifyAccountType,
  isJointAccount,
  isLiabilityClass,
  isLiquidAccountType,
  ownershipSharePercent,
} from "@/lib/domain/accounts"
import type { AccountId, UserId } from "@/lib/query"
import { mutationKeys, optimisticMutationOptions, queryKeys } from "@/lib/query"

import type { AccountDetail, AccountSummary, AccountsView } from "./accounts"
import { compareAccounts } from "./accounts"

export const PENDING_ACCOUNT_ID = "pending-account"

export interface CreateAccountVariables {
  body: UpdateAccount
}

export interface UpdateAccountVariables {
  body: UpdateAccount
}

export interface DeleteAccountVariables {
  accountId: AccountId
}

function accountInvalidations(userId: UserId) {
  const keys = queryKeys.user(userId)
  return [keys.accounts.all(), keys.portfolio.all()]
}

function summaryFrom(
  view: AccountsView,
  accountId: string,
  body: UpdateAccount,
  previous: AccountSummary | undefined
): AccountSummary {
  const option = view.accountTypes.find((type) => type.id === body.account_type)
  const type = { id: body.account_type, name: option?.name ?? null }
  const accountClass = option?.accountClass ?? classifyAccountType(type)
  const liquidity = view.liquidityTypes.find(
    (entry) => entry.id === body.liquidity_type
  )

  return {
    accountId,
    name: body.name,
    accountTypeId: body.account_type,
    accountTypeName: option?.name ?? null,
    accountClass,
    isLiquid: option?.isLiquid ?? isLiquidAccountType(type),
    isLiability: option?.isLiability ?? isLiabilityClass(accountClass),
    liquidityTypeId: body.liquidity_type,
    liquidityTypeName: liquidity?.name ?? null,
    ownershipShare: body.ownership_share,
    ownershipSharePercent: ownershipSharePercent(body.ownership_share),
    isJoint: isJointAccount(body.ownership_share),
    suggestedCurrencyAssetId: previous?.suggestedCurrencyAssetId ?? null,
    suggestedCurrency: previous?.suggestedCurrency ?? null,
  }
}

export function withAccounts(
  view: AccountsView,
  accounts: readonly AccountSummary[]
): AccountsView {
  const sorted = [...accounts].sort(compareAccounts)
  const byId: Record<string, AccountSummary | undefined> = {}
  for (const account of sorted) byId[account.accountId] = account

  return {
    ...view,
    accounts: sorted,
    byId,
    groups: ACCOUNT_CLASS_ORDER.map((accountClass) => ({
      accountClass,
      label: ACCOUNT_CLASS_LABELS[accountClass],
      accounts: sorted.filter(
        (account) => account.accountClass === accountClass
      ),
    })),
    count: sorted.length,
    jointCount: sorted.filter((account) => account.isJoint).length,
  }
}

function listKey(userId: UserId) {
  return queryKeys.user(userId).accounts.list()
}

export function useCreateAccount(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<AccountId, CreateAccountVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).accounts(),
      mutationFn: async ({ body }) => {
        const response = await api(AccountsApiFactory).addAccount(userId, body)
        return response.data.account_id
      },
      updates: [
        {
          queryKey: listKey(userId),
          apply: (client, { body }) => {
            client.setQueryData<AccountsView>(listKey(userId), (previous) =>
              previous === undefined
                ? previous
                : withAccounts(previous, [
                    ...previous.accounts,
                    summaryFrom(previous, PENDING_ACCOUNT_ID, body, undefined),
                  ])
            )
          },
        },
      ],
      invalidate: accountInvalidations(userId),
      meta: { errorContext: "The account could not be created" },
    })
  )
}

export function useUpdateAccount(userId: UserId, accountId: AccountId | null) {
  const queryClient = useQueryClient()
  const detailKey = queryKeys
    .user(userId)
    .accounts.detail(accountId ?? PENDING_ACCOUNT_ID)

  return useMutation(
    optimisticMutationOptions<void, UpdateAccountVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).accounts(),
      mutationFn: async ({ body }) => {
        if (accountId === null) throw new Error("No account is being edited")
        await api(AccountsApiFactory).updateAccount(accountId, userId, body)
      },
      updates: [
        {
          queryKey: listKey(userId),
          apply: (client, { body }) => {
            client.setQueryData<AccountsView>(listKey(userId), (previous) =>
              previous === undefined
                ? previous
                : withAccounts(
                    previous,
                    previous.accounts.map((account) =>
                      account.accountId === accountId
                        ? summaryFrom(
                            previous,
                            account.accountId,
                            body,
                            account
                          )
                        : account
                    )
                  )
            )
          },
        },
        {
          queryKey: detailKey,
          apply: (client, { body }) => {
            client.setQueryData<AccountDetail>(detailKey, (previous) => {
              if (previous === undefined) return previous
              const type = { id: body.account_type, name: null }
              const accountClass = classifyAccountType(type)
              return {
                ...previous,
                name: body.name,
                accountTypeId: body.account_type,
                accountClass,
                isLiquid: isLiquidAccountType(type),
                isLiability: isLiabilityClass(accountClass),
                liquidityTypeId: body.liquidity_type,
                ownershipShare: body.ownership_share,
                ownershipSharePercent: ownershipSharePercent(
                  body.ownership_share
                ),
                isJoint: isJointAccount(body.ownership_share),
                identifiers: body.identifiers ?? [],
              }
            })
          },
        },
      ],
      invalidate: accountInvalidations(userId),
      meta: { errorContext: "The account could not be saved" },
    })
  )
}

export function useDeleteAccount(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, DeleteAccountVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).accounts(),
      mutationFn: async ({ accountId }) => {
        await api(AccountsApiFactory).deleteAccount(accountId, userId)
      },
      updates: [
        {
          queryKey: listKey(userId),
          apply: (client, { accountId }) => {
            client.setQueryData<AccountsView>(listKey(userId), (previous) =>
              previous === undefined
                ? previous
                : withAccounts(
                    previous,
                    previous.accounts.filter(
                      (account) => account.accountId !== accountId
                    )
                  )
            )
          },
        },
      ],
      invalidate: accountInvalidations(userId),
      meta: { errorContext: "The account could not be deactivated" },
    })
  )
}
