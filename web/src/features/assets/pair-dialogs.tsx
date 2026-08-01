import { useMemo, useState } from "react"

import { useUserId } from "@/auth"
import type { AssetRef } from "@/lib/domain/refs"
import { assetDisplayName, assetLabel } from "@/lib/domain/refs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError } from "@/components/ui/field"
import type { PickerOption } from "@/components/primitives"
import { EntityPicker } from "@/components/primitives"

import { ConfirmDestructive } from "@/features/settings/confirm-dialog"

import { useAddAssetPair, useAssetSearch, useDeleteAssetPair } from "./api"
import { pairAddedToast, pairRemovedToast } from "./toasts"

export const PAIR_SEARCH_PLACEHOLDER = "Search assets…"
export const PAIR_NOT_CHOSEN = "Choose the asset to price this one in."
export const PAIR_EXISTS = "That pair already exists."
export const PAIR_SELF = "An asset cannot be priced against itself."

function pairOption(asset: AssetRef): PickerOption {
  const label = assetLabel(asset)
  const name = assetDisplayName(asset)
  return {
    value: String(asset.assetId),
    label,
    ...(name === label ? {} : { subLabel: name, keywords: [name] }),
  }
}

export function AddPairDialog({
  assetId,
  ticker,
  existing,
  onOpenChange,
  onAdded,
}: {
  assetId: number
  ticker: string
  existing: readonly AssetRef[]
  onOpenChange: (open: boolean) => void
  onAdded: (referenceId: number) => void
}) {
  const userId = useUserId()
  const addPair = useAddAssetPair(userId)
  const search = useAssetSearch()
  const [selected, setSelected] = useState<AssetRef | null>(null)
  const [issue, setIssue] = useState<string | null>(null)

  const shown = useMemo<readonly AssetRef[]>(
    () =>
      selected === null
        ? search.assets
        : [
            selected,
            ...search.assets.filter(
              (asset) => asset.assetId !== selected.assetId
            ),
          ],
    [search.assets, selected]
  )
  const options = useMemo(() => shown.map(pairOption), [shown])
  const taken = new Set(existing.map((asset) => asset.assetId))

  function submit() {
    if (selected === null) {
      setIssue(PAIR_NOT_CHOSEN)
      return
    }
    if (selected.assetId === assetId) {
      setIssue(PAIR_SELF)
      return
    }
    if (taken.has(selected.assetId)) {
      setIssue(PAIR_EXISTS)
      return
    }
    setIssue(null)
    const reference = selected
    addPair.mutate(
      { assetId, body: { reference_id: reference.assetId } },
      {
        onSuccess: () => {
          onOpenChange(false)
          onAdded(reference.assetId)
          pairAddedToast(assetLabel(reference))
        },
      }
    )
  }

  const conflict = addPair.error?.kind === "conflict" ? PAIR_EXISTS : null

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a reference pair</DialogTitle>
          <DialogDescription>
            A valuation is a rate between two assets. Pairing {ticker} with
            another asset lets you record what one unit of it is worth in that
            asset&rsquo;s terms.
          </DialogDescription>
        </DialogHeader>
        <Field data-invalid={issue !== null || conflict !== null}>
          <EntityPicker
            label="Reference asset"
            value={selected === null ? null : String(selected.assetId)}
            placeholder={PAIR_SEARCH_PLACEHOLDER}
            invalid={issue !== null || conflict !== null}
            options={options}
            search={{
              query: search.query,
              onQueryChange: search.setQuery,
              pending: search.pending,
              hasMore: search.hasMore,
              onLoadMore: search.loadMore,
              total: search.total,
            }}
            onValueChange={(next) => {
              setIssue(null)
              if (next === null) {
                setSelected(null)
                return
              }
              const found = shown.find(
                (asset) => String(asset.assetId) === next
              )
              if (found !== undefined) setSelected(found)
            }}
          />
          <FieldDescription>
            Type a ticker or a name to search every asset Sverto knows about.
          </FieldDescription>
          {(issue ?? conflict) ? (
            <FieldError>{issue ?? conflict}</FieldError>
          ) : null}
        </Field>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button disabled={addPair.isPending} onClick={submit}>
            {addPair.isPending ? "Adding…" : "Add pair"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DeletePairDialog({
  assetId,
  reference,
  onOpenChange,
  onDeleted,
}: {
  assetId: number
  reference: AssetRef | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const userId = useUserId()
  const deletePair = useDeleteAssetPair(userId)
  const label = reference === null ? "this pair" : assetLabel(reference)

  return (
    <ConfirmDestructive
      open={reference !== null}
      onOpenChange={onOpenChange}
      title={`Remove the ${label} pair?`}
      lost={`Every valuation you entered against ${label} goes with it, so anything that was priced through this pair stops having a value.`}
      survives="The asset itself, its other pairs and every transaction that references it are untouched."
      confirmLabel="Remove pair"
      pending={deletePair.isPending}
      onConfirm={() => {
        if (reference === null) return
        deletePair.mutate(
          { assetId, referenceId: reference.assetId },
          {
            onSuccess: () => {
              onDeleted()
              pairRemovedToast(label)
            },
            onSettled: () => {
              onOpenChange(false)
            },
          }
        )
      }}
    />
  )
}
