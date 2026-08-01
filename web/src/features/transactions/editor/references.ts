import { useMemo } from "react"

import type { AssetRef } from "@/lib/domain/refs"
import { assetDisplayName, assetLabel } from "@/lib/domain/refs"
import type { UserId } from "@/lib/query"
import { useAccountsSuspense } from "@/features/accounts/api"
import { useCategoryCatalogue } from "@/features/categories/api"
import { useCurrencyAssets } from "@/features/onboarding/currency-assets"

import type { FieldOption } from "./fields"

export interface EditorReferences {
  readonly accountOptions: readonly FieldOption[]
  readonly currencyOptions: readonly FieldOption[]
  readonly categoryOptions: readonly FieldOption[]
  readonly currencies: readonly AssetRef[]
  readonly accountName: (accountId: string | null) => string | null
  readonly categoryName: (categoryId: number | null) => string | null
  readonly currencyById: Readonly<Record<number, AssetRef | undefined>>
  readonly suggestedCurrency: (accountId: string | null) => number | null
}

export function useEditorReferences(userId: UserId): EditorReferences {
  const accounts = useAccountsSuspense(userId)
  const catalogue = useCategoryCatalogue(userId)
  const currencies = useCurrencyAssets()

  return useMemo(() => {
    const currencyById: Record<number, AssetRef | undefined> = {}
    for (const currency of currencies) currencyById[currency.assetId] = currency

    const accountOptions: FieldOption[] = accounts.groups.flatMap((group) =>
      group.accounts.map((account) => ({
        value: account.accountId,
        label: account.name,
        identity: account.accountId,
        group: group.label,
        ...(account.accountTypeName === null
          ? {}
          : { subLabel: account.accountTypeName }),
      }))
    )

    const categoryOptions: FieldOption[] = catalogue.groups.flatMap((group) =>
      group.categories.map((category) => ({
        value: String(category.id),
        label: category.name,
        group: group.type.name,
        icon: category.icon,
      }))
    )

    return {
      accountOptions,
      categoryOptions,
      currencies,
      currencyById,
      currencyOptions: currencies.map((currency) => {
        const label = assetLabel(currency)
        const name = assetDisplayName(currency)
        return {
          value: String(currency.assetId),
          label,
          ...(name === label ? {} : { subLabel: name, keywords: [name] }),
        }
      }),
      accountName: (accountId) =>
        accountId === null ? null : (accounts.byId[accountId]?.name ?? null),
      categoryName: (categoryId) =>
        categoryId === null
          ? null
          : (catalogue.byId.get(categoryId)?.name ?? null),
      suggestedCurrency: (accountId) =>
        accountId === null
          ? null
          : (accounts.byId[accountId]?.suggestedCurrencyAssetId ?? null),
    }
  }, [accounts, catalogue, currencies])
}
