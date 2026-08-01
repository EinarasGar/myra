import { useMutation, useQueryClient } from "@tanstack/react-query"

import type {
  AddAssetPairRequest,
  AddAssetRequest,
  AssetRate,
  UserAssetPairMetadata,
} from "@/api"
import { UserAssetsApiFactory } from "@/api"
import { api } from "@/lib/api"
import type { AssetRef } from "@/lib/domain/refs"
import type { AssetId, UserId } from "@/lib/query"
import {
  mutationKeys,
  optimisticMutationOptions,
  optimisticUpdate,
  queryKeys,
} from "@/lib/query"

export interface CreateCustomAssetVariables {
  body: AddAssetRequest
}

export interface UpdateCustomAssetVariables {
  assetId: AssetId
  body: AddAssetRequest
}

export interface DeleteCustomAssetVariables {
  assetId: AssetId
}

export interface AddAssetPairVariables {
  assetId: AssetId
  body: AddAssetPairRequest
}

export interface AddManualRatesVariables {
  assetId: AssetId
  referenceId: AssetId
  rates: AssetRate[]
}

export interface DeleteManualRatesVariables {
  assetId: AssetId
  referenceId: AssetId
  startTimestamp: number
  endTimestamp: number
}

export interface DeleteAssetPairVariables {
  assetId: AssetId
  referenceId: AssetId
}

export interface UpdateAssetExchangeVariables {
  assetId: AssetId
  referenceId: AssetId
  body: UserAssetPairMetadata
}

/**
 * A manual rate is read back through three separate roots: the user-scoped pair queries,
 * the reference-scoped `/assets/{id}/converted` ones the portfolio hero chart uses, and
 * every portfolio total that values the holding. Invalidating only the first leaves the
 * asset page showing the pre-edit price line.
 */
function valuationScopes(userId: UserId) {
  return [
    queryKeys.user(userId).assets.all(),
    queryKeys.user(userId).portfolio.all(),
    queryKeys.reference.assets.all(),
  ]
}

export function useCreateCustomAsset(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<AssetRef, CreateCustomAssetVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).assets(),
      mutationFn: async ({ body }) => {
        const response = await api(UserAssetsApiFactory).postCustomAsset(
          userId,
          body
        )
        return {
          assetId: response.data.asset_id,
          ticker: response.data.ticker,
          name: response.data.name,
          assetTypeId: response.data.asset_type,
        }
      },
      updates: [],
      invalidate: [queryKeys.user(userId).assets.all()],
      meta: { errorContext: "The asset could not be created" },
    })
  )
}

export function useUpdateCustomAsset(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, UpdateCustomAssetVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).assets(),
      mutationFn: async ({ assetId, body }) => {
        await api(UserAssetsApiFactory).putCustomAsset(userId, assetId, body)
      },
      updates: [
        optimisticUpdate<AssetRef[], UpdateCustomAssetVariables>(
          queryKeys.user(userId).assets.list(),
          (previous, { assetId, body }) =>
            previous?.map((asset) =>
              asset.assetId === assetId
                ? {
                    ...asset,
                    ticker: body.ticker,
                    name: body.name,
                    assetTypeId: body.asset_type,
                  }
                : asset
            )
        ),
      ],
      invalidate: [queryKeys.user(userId).assets.all()],
      meta: { errorContext: "The asset could not be saved" },
    })
  )
}

export function useDeleteCustomAsset(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, DeleteCustomAssetVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).assets(),
      mutationFn: async ({ assetId }) => {
        await api(UserAssetsApiFactory).deleteAsset(userId, assetId)
      },
      updates: [
        optimisticUpdate<AssetRef[], DeleteCustomAssetVariables>(
          queryKeys.user(userId).assets.list(),
          (previous, { assetId }) =>
            previous?.filter((asset) => asset.assetId !== assetId)
        ),
      ],
      invalidate: [queryKeys.user(userId).portfolio.all()],
      meta: { errorContext: "The asset could not be deleted" },
    })
  )
}

export function useAddAssetPair(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, AddAssetPairVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).assets(),
      mutationFn: async ({ assetId, body }) => {
        await api(UserAssetsApiFactory).postAssetPair(userId, assetId, body)
      },
      updates: [],
      invalidate: valuationScopes(userId),
      meta: { errorContext: "The asset pair could not be added" },
    })
  )
}

export function useDeleteAssetPair(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, DeleteAssetPairVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).assets(),
      mutationFn: async ({ assetId, referenceId }) => {
        await api(UserAssetsApiFactory).deleteAssetPair(
          userId,
          assetId,
          referenceId
        )
      },
      updates: [],
      invalidate: valuationScopes(userId),
      meta: { errorContext: "The pair could not be removed" },
    })
  )
}

export function useAddManualRates(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, AddManualRatesVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).assets(),
      mutationFn: async ({ assetId, referenceId, rates }) => {
        await api(UserAssetsApiFactory).postCustomAssetRates(
          userId,
          assetId,
          referenceId,
          { rates }
        )
      },
      updates: [],
      invalidate: valuationScopes(userId),
      meta: { errorContext: "The valuation could not be saved" },
    })
  )
}

export function useDeleteManualRates(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, DeleteManualRatesVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).assets(),
      mutationFn: async ({
        assetId,
        referenceId,
        startTimestamp,
        endTimestamp,
      }) => {
        await api(UserAssetsApiFactory).deleteAssetPairRates(
          userId,
          assetId,
          referenceId,
          startTimestamp,
          endTimestamp
        )
      },
      updates: [],
      invalidate: valuationScopes(userId),
      meta: { errorContext: "The valuations could not be removed" },
    })
  )
}

export function useUpdateAssetExchange(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation(
    optimisticMutationOptions<void, UpdateAssetExchangeVariables>({
      queryClient,
      mutationKey: mutationKeys.user(userId).assets(),
      mutationFn: async ({ assetId, referenceId, body }) => {
        await api(UserAssetsApiFactory).putCustomAssetPair(
          userId,
          assetId,
          referenceId,
          body
        )
      },
      updates: [],
      invalidate: [queryKeys.user(userId).assets.all()],
      meta: { errorContext: "The exchange could not be saved" },
    })
  )
}
