import { useMemo } from "react"

import type { AssetRef } from "@/lib/domain/refs"
import { assetDisplayName, assetLabel } from "@/lib/domain/refs"
import { useAssetSearch } from "@/features/assets/api"

import type { FieldOption, ProvenanceFieldProps } from "./fields"
import { SelectField } from "./fields"

const ASSET_SEARCH_PLACEHOLDER = "Search assets…"
const ASSET_SEARCH_EMPTY = "Nothing matches that."
const ASSET_SEARCH_HINT = "Type a ticker or a name to search every asset."

function assetOption(asset: AssetRef): FieldOption {
  const label = assetLabel(asset)
  const name = assetDisplayName(asset)
  return {
    value: String(asset.assetId),
    label,
    ...(name === label ? {} : { subLabel: name, keywords: [name] }),
  }
}

export function AssetSearchField({
  value,
  onChange,
  known,
  label,
  errors,
  mark,
  hint,
  onResolved,
}: ProvenanceFieldProps & {
  value: number | null
  onChange: (assetId: number | null) => void
  known: readonly AssetRef[]
  label: string
  onResolved: (asset: AssetRef) => void
}) {
  const search = useAssetSearch()

  const byId = useMemo(() => {
    const assets = new Map<number, AssetRef>()
    for (const asset of known) assets.set(asset.assetId, asset)
    for (const asset of search.assets) assets.set(asset.assetId, asset)
    return assets
  }, [known, search.assets])

  /**
   * A field's own value must always be in its own option list, or editing a saved
   * transaction reads as unset the moment the search results do not happen to contain it.
   */
  const options = useMemo<FieldOption[]>(() => {
    const shown =
      search.query.trim() === ""
        ? [...byId.values()]
        : [
            ...(value === null ? [] : [byId.get(value)]).filter(
              (asset): asset is AssetRef => asset !== undefined
            ),
            ...search.assets.filter((asset) => asset.assetId !== value),
          ]
    return shown.map(assetOption)
  }, [byId, search.assets, search.query, value])

  return (
    <SelectField
      label={label}
      hint={hint ?? ASSET_SEARCH_HINT}
      {...(errors === undefined ? {} : { errors })}
      {...(mark === undefined ? {} : { mark })}
      placeholder={ASSET_SEARCH_PLACEHOLDER}
      emptyLabel={ASSET_SEARCH_EMPTY}
      value={value === null ? "" : String(value)}
      options={options}
      search={{
        query: search.query,
        onQueryChange: search.setQuery,
        pending: search.pending,
        hasMore: search.hasMore,
        onLoadMore: search.loadMore,
        total: search.total,
      }}
      onChange={(next) => {
        if (next === "") {
          onChange(null)
          return
        }
        const assetId = Number(next)
        onChange(assetId)
        const resolved = byId.get(assetId)
        if (resolved !== undefined) onResolved(resolved)
      }}
    />
  )
}
