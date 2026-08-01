import { z } from "zod"

import { boundedName } from "@/lib/validation"

import type { AddAssetPairRequest, AddAssetRequest } from "@/api"

export const ASSET_TICKER_MAX_LENGTH = 20
export const ASSET_NAME_MAX_LENGTH = 200

export const customAssetFormSchema = z.object({
  ticker: boundedName(ASSET_TICKER_MAX_LENGTH),
  name: boundedName(ASSET_NAME_MAX_LENGTH),
  asset_type: z.int().positive("Select an asset type."),
  base_asset_id: z.int().positive("Select a currency to price this against."),
}) satisfies z.ZodType<AddAssetRequest>

export const assetPairFormSchema = z.object({
  reference_id: z.int().positive("Select a reference asset."),
}) satisfies z.ZodType<AddAssetPairRequest>

export const manualRateFormSchema = z.object({
  date: z.int("Select a date."),
  rate: z.number().positive("Enter a rate above zero."),
})

export type CustomAssetFormValues = z.infer<typeof customAssetFormSchema>
export type AssetPairFormValues = z.infer<typeof assetPairFormSchema>
export type ManualRateFormValues = z.infer<typeof manualRateFormSchema>
